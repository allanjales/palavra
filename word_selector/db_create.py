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

		# Connect database
		connect = sqlite3.connect(self.db_name) 
		cursor = connect.cursor()

		# Create table
		cursor.execute("CREATE TABLE words_full ([id] INTEGER PRIMARY KEY, [word] text, [frequency] integer)")
		cursor.execute("CREATE TABLE words_data ([id] INTEGER PRIMARY KEY, [word] text)")
		cursor.execute("CREATE TABLE words_list ([id] INTEGER PRIMARY KEY, [word] text, [normalized_word] text, [frequency] integer)")

		connect.commit()

	def load_txt_frequency(self, filename):
		# Read .txt file as array of message
		with open(filename, "r", encoding='utf-8') as file:
			self.words = re.findall(r'([a-zà-ú]+) (\d+)', file.read())
			file.close()

		# Connect database
		connect = sqlite3.connect(self.db_name) 
		cursor = connect.cursor()

		# Add every word on database
		for word in self.words:
			cursor.execute("INSERT INTO words_full (word, frequency) VALUES (?, ?)", (word[0], word[1]))

		connect.commit()

	def load_txt_list(self, filename):
		# Read .txt file as array of message
		with open(filename, "r") as file:
			self.words = re.findall(r'(?:\n|^)([a-zà-ú]+)(?=\n|$)', file.read())
			file.close()

		# Connect database
		connect = sqlite3.connect(self.db_name) 
		cursor = connect.cursor()

		# Add every word on database
		for word in self.words:
			cursor.execute("INSERT INTO words_data (word) VALUES (?)", (word,))

		connect.commit()

	def save_selected_to_db(self):
		# Connect database
		connect = sqlite3.connect(self.db_name) 
		cursor = connect.cursor()

		# Add every word on database
		cursor.execute("INSERT INTO words_list (word, frequency)\
			SELECT words_full.word, frequency\
			FROM words_full\
			INNER JOIN words_data\
			ON words_full.word=words_data.word\
			WHERE LENGTH(words_full.word)=5\
			AND frequency >= 250\
			ORDER BY RANDOM()")


		#Normalize each word
		cursor.execute("SELECT id, word FROM words_list")
		results = cursor.fetchall()
		for result in results:
			cursor.execute("UPDATE words_list SET [normalized_word] = (?) WHERE id=(?)", (unidecode.unidecode(result[1]), result[0]))

		cursor.execute("DROP TABLE words_full")
		cursor.execute("DROP TABLE words_data")
		connect.commit()
		cursor.execute("VACUUM")


# Creates database
db = database('pt_br_full.db')
db.recreate_db()
db.load_txt_frequency('pt_br_full.txt')
print("Loaded 1/2")
db.load_txt_list('wordlist-big-20220210.txt')
print("Loaded 2/2")
db.save_selected_to_db()
print('Done.')