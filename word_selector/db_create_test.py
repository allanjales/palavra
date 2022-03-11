import re
import sqlite3
import os
import time
import unidecode

class database:
	'''
	This class will collect all data from a whatsapp chat for analysis
	'''

	def __init__(self, name = 'database.db'):
		'''
		This class will initiate some variables with the class
		The name is refered to Database name. For it initialization, you must use the recreate_db() function of this class.
		'''

		self.db_name = name
		self.obj_start_time = time.time()

	def __str__(self):
		'''
		This function will show the database name when called print() function
		'''

		return str(self.db_name)

	def recreate_db(self):
		'''
		Creates a new DateBase file with the predefined name removing a old one if is in place
		'''

		# Remove old database
		if os.path.exists(self.db_name):
			os.remove(self.db_name)
		else:
			print('DB created')

	def load_txt_frequency(self, filename):
		# Read .txt file as array of message
		with open(filename, "r", encoding='utf-8') as file:
			words = re.findall(r'(?:^|\n)([a-zà-ú]{5}) (\d+)', file.read())
			file.close()

		# Connect database
		connect = sqlite3.connect(self.db_name) 
		cursor = connect.cursor()

		# Create table
		cursor.execute("CREATE TABLE words_full ([id] INTEGER PRIMARY KEY, [word] text, [frequency] integer)")

		# Add every word on database
		for word in words:
			cursor.execute("INSERT INTO words_full (word, frequency) VALUES (?, ?)", (word[0], word[1]))

		connect.commit()

	def load_txt_list(self, dbname, filename):
		# Read .txt file as array of message
		with open(filename, "r") as file:
			words = re.findall(r'(?:\n|^)([a-zà-ú]{5})(\/.+){0,1}(?=\n|$)', file.read())
			file.close()

		# Connect database
		connect = sqlite3.connect(self.db_name) 
		cursor = connect.cursor()

		# Create database
		cursor.execute("CREATE TABLE "+dbname+" ([id] INTEGER PRIMARY KEY, [word] text)")

		# Add every word on database
		for word in words:
			cursor.execute("INSERT INTO "+dbname+" (word) VALUES (?)", (word[0],))

		connect.commit()

	def save_selected_to_db(self):
		# Connect database
		connect = sqlite3.connect(self.db_name) 
		cursor = connect.cursor()

		# Create database
		cursor.execute("CREATE TABLE words_list ([id] INTEGER PRIMARY KEY, [word] text, [normalized_word] text, [frequency] integer)")

		# Add every word on database
		cursor.execute("INSERT INTO words_list (word, frequency)\
			SELECT words_full.word, frequency\
			FROM words_full\
			INNER JOIN word_list1\
			ON words_full.word=word_list1.word\
			INNER JOIN word_list2\
			ON words_full.word=word_list2.word\
			ORDER BY RANDOM()")

		#Normalize each word
		cursor.execute("SELECT id, word FROM words_list")
		results = cursor.fetchall()
		for result in results:
			cursor.execute("UPDATE words_list SET [normalized_word] = (?) WHERE id=(?)", (unidecode.unidecode(result[1]), result[0]))

		#cursor.execute("DROP TABLE words_full")
		#cursor.execute("DROP TABLE word_list1")
		#cursor.execute("DROP TABLE word_list2")
		connect.commit()
		#cursor.execute("VACUUM")

# Creates database
db = database('pt_br_full_test.db')
db.recreate_db()
db.load_txt_frequency('pt_br_full.txt')
print("Loaded 1")
db.load_txt_list('word_list1', 'wordlist-big-20220210.txt')
print("Loaded 2")
db.load_txt_list('word_list2', 'pt_BR.dic')
print("Loaded 3")
db.save_selected_to_db()
print('Done.')