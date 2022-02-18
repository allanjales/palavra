Game = function()
{
	this.target = null

	this.db
	let config = {
		locateFile: () => "cssjs/sql-wasm.wasm",
	};
	initSqlJs(config).then(function (SQL) {
		const xhr = new XMLHttpRequest();
		xhr.open('GET', 'word_selector/pt_br_full.db', true);
		xhr.responseType = 'arraybuffer';

		xhr.onload = e => {
			const uInt8Array = new Uint8Array(xhr.response)
			this.db = new SQL.Database(uInt8Array)
			
			diff_days = Math.floor((new Date()-new Date('2022-02-18')) / (1000 * 60 * 60 * 24))
			let length = this.db.exec('SELECT COUNT(*) FROM words_list')[0].values[0][0]
			this.target = this.db.exec('SELECT word FROM words_list LIMIT 1 OFFSET $id', {$id: diff_days%length})[0].values[0][0]
			console.info('Loaded')
		};
		xhr.send();
	});

	this.KeyDown = function(event)
	{
		if (event.keyCode >= 65 && event.keyCode <= 90)
			this.add_letter(String.fromCharCode(event.which))
		else if (event.code == "Enter" || event.code == "NumpadEnter")
			this.enter()
		else if (event.code == "Backspace")
			this.backspace()
		else if (event.code == "Space")
			this.space()
		else if (event.key == "ç")
			this.add_letter("c")
	}

	this.add_letter = function(letter)
	{
		let edit_letter = document.querySelector(".edit_letter")
		if (edit_letter)
		{
			//Add letter
			edit_letter.innerText = letter;

			//Find next blank spot
			let spaces = document.querySelectorAll(".edit_letter~.letter_space")
			for (const space of spaces)
				if (space.innerText == "")
				{
					this.switch_edit(space)
					return
				}

			//Find any blank spot
			spaces = document.querySelectorAll(".edit_row>.letter_space")
			for (const space of spaces)
				if (space.innerText == "")
				{
					this.switch_edit(space)
					return
				}
			this.switch_edit()
		}
	}

	this.switch_edit = function(next_edit)
	{
		//Remove old one
		let edit_letter = document.querySelector(".edit_letter")
		if (edit_letter)
			edit_letter.classList.remove("edit_letter")

		//Add the new one
		if (next_edit)
			next_edit.classList.add("edit_letter")
	}

	this.switch_row = function()
	{
		let edit_row = document.querySelector(".edit_row")
		if (edit_row)
		{
			let next_edit = document.querySelector(".edit_row+.row")
			if (next_edit)
				next_edit.classList.add("edit_row")
			edit_row.classList.remove("edit_row")
		}
	}

	this.check_word = function(letter, position)
	{
		let word = this.target.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
		if (letter == word[position])
			return "right"
		if (word.includes(letter))
			return "near"
		return "wrong"
	}

	this.space = function()
	{
		//Find next blank spot
		let spaces = document.querySelectorAll(".edit_letter~.letter_space")
		for (const space of spaces)
			if (space.innerText == "")
			{
				this.switch_edit(space)
				return
			}
		
		//Edit in the end
		let edit_pos = document.querySelector(".edit_row .edit_letter")
		spaces = document.querySelectorAll(".edit_row>.letter_space")
		for (const space of spaces)
		{
			if (space.innerText == "" && space != edit_pos)
			{
				this.switch_edit(space)
				return
			}
			
			if (space.innerText == "")
			{
				this.switch_edit()
				return
			}
		}
	}

	this.enter = function()
	{
		if (this.target === null)
			return

		//All letters ok
		let spaces = document.querySelectorAll(".edit_row>.letter_space")
		let word = ""
		for (const space of spaces)
		{
			if (space.innerText == "")
				return
			word += space.innerText
		}

		//Get if word exists
		let result = this.db.exec('SELECT word FROM words_list WHERE normalized_word=$word', {$word: word.toLowerCase()})
		if (result.length == 0)
			return

		//Add accents and unormalize word
		result = result[0].values[0][0]
		for (let i = 0; i < result.length; i++)
		{
			spaces[i].innerText = result[i]
		}

		switch_row()

		//Mark letters on keyboard
		for (let key of spaces.keys())
		{
			let result = this.check_word(spaces[key].innerText, key)
			spaces[key].classList.add(result)

			let kbds = document.querySelectorAll("kbd.letter")
			for (let kbd of kbds)
				if (kbd.innerText == spaces[key].innerText)
				{
					if (kbd.classList.remove("wrong"))
						continue
					if (kbd.classList.contains("right"))
						continue
					if (kbd.classList.contains("near"))
						kbd.classList.remove("near")
					kbd.classList.add(result)
					continue
				}
		}
		this.switch_edit(document.querySelector(".edit_row>.letter_space"))
	}

	this.backspace = function()
	{
		let spaces = document.querySelectorAll(".edit_row>.letter_space")
		let found = false
		for (let key of spaces.keys())
			if (spaces[key].classList.contains("edit_letter"))
			{
				found = key
				break
			}

		if (found && spaces[found].innerText)
		{
			spaces[found].innerText = ""
			return
		}

		if (found > 0)
		{
			spaces[found-1].innerText = ""
			this.switch_edit(spaces[found-1])
			return
		}

		if (found === 0)
			spaces[found].innerText = ""

		if (found !== 0)
		{
			let last_space = spaces[spaces.length - 1]
			last_space.innerText = ""
			this.switch_edit(last_space)
			return
		}
	}

	//Physical keyboard
	document.addEventListener("keydown", (e) => this.KeyDown(e));

	//Game board
	let spaces = document.querySelectorAll(".letter_space");
	for (const space of spaces)
		space.addEventListener("click", (e) => {
			if (e.target.parentElement.classList.contains("edit_row"))
				this.switch_edit(e.target)
		}, false);

	//Virtual keyboard
	let keys = document.querySelectorAll("kbd.letter");
	for (const key of keys)
		key.addEventListener("click", (e) => this.add_letter(e.target.innerText), false);
	document.querySelector("#kbd_enter").addEventListener("click", (e) => this.enter(), false);
	document.querySelector("#kbd_backspace").addEventListener("click", (e) => this.backspace(), false);
}
Game()