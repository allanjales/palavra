import re
import os
import random

filename = "wordlist-big-20220210.txt"
with open(filename, "r") as file:
	words = re.findall(r'(?:\n)([a-zà-ú]{5})(?:\n)', file.read())
	file.close()

random.shuffle(words)

f = open("output.txt", "w")
for word in words:
	f.write(word+"\n")
f.close()