f = open('enable.txt', 'r')
lines = f.read().splitlines()

for word in lines:
	if len(word) <= 7:
		print("'" + word + "',")