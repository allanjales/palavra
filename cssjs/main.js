Game = function()
{
	this.target = null
	this.start_date = new Date('2022-02-18 00:00:00')
	this.db = null

	document.querySelector("body .holder").style.display = "none";

	this.stats =
	{
		games:
		{
			0: 0,
			1: 0,
			2: 0,
			3: 0,
			4: 0,
			5: 0,
			6: 0
		},
		sequence: 0,
		best_sequence: 0
	}

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
			
			diff_days = Math.floor((new Date()-this.start_date) / (1000 * 60 * 60 * 24))
			let length = this.db.exec('SELECT COUNT(*) FROM words_list')[0].values[0][0]
			this.target = this.db.exec('SELECT word FROM words_list LIMIT 1 OFFSET $id', {$id: diff_days%length})[0].values[0][0]
			this.update_HUD()
			document.querySelector("body .holder").style.display = "";
			console.info('By Allan Jales')
		};
		xhr.send();
	});

	this.KeyDown = function(event)
	{
		if (event.keyCode >= 65 && event.keyCode <= 90)
			this.add_letter(String.fromCharCode(event.which))
		else if (event.keyCode == 13)	//Enter
			this.enter()
		else if (event.keyCode == 8)	//Backspace
			this.backspace()
		else if (event.keyCode == 32)	//Space
			this.space()
		else if (event.keyCode == 186)	//ç
			this.add_letter("c")
	}

	this.add_letter = function(letter)
	{
		let edit_letter = document.querySelector(".edit_letter")
		if (edit_letter)
		{
			//Add letter
			edit_letter.innerText = letter

			edit_letter.style.animation = null
			edit_letter.offsetHeight
			edit_letter.style.animation = "add_letter 0.15s ease-in-out"

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

	this.switch_row = function(next = true)
	{
		let edit_row = document.querySelector(".edit_row")
		if (edit_row)
		{
			let next_edit = document.querySelector(".edit_row+.row")
			if (next_edit && next)
				next_edit.classList.add("edit_row")
			edit_row.classList.remove("edit_row")
		}
		this.save_cookie()
	}

	this.check_word = function(word)
	{
		//Mark letters
		let try_letters    = word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().split('')
		let target_letters = this.target.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().split('')
		let check_result   = new Array(target_letters.length);

		//Get rights
		for (let i of try_letters.keys())
			if (try_letters[i] == target_letters[i])
			{
				check_result[i] = "right"
				target_letters[i] = null
			}

		//Get nears
		for (let i of try_letters.keys())
			if (!check_result[i] && target_letters.includes(try_letters[i]))
			{
				let index = target_letters.indexOf(try_letters[i])
				target_letters[index] = null
				check_result[i] = "near"
			}

		//Set wrongs
		for (let i of try_letters.keys())
			if (!check_result[i])
				check_result[i] = "wrong"

		return check_result
	}

	this.update_HUD = function()
	{
		//Pass through rows
		const rows = document.querySelectorAll("#board > .row");
		for (i of rows.keys())
		{
			//Get row word
			const spaces = rows[i].querySelectorAll(".letter_space")
			let word = ""
			for (const space of spaces)
			{
				if (space.innerText == "")
					return
				word += space.innerText
			}

			//Get check of word
			let check_result = this.check_word(word)

			//Show check result to user on gameboard
			for (let j of spaces.keys())
				spaces[j].classList.add(check_result[j])

			//Show check result to user on keyboard
			let kbds = document.querySelectorAll("kbd.letter")
			for (let j of spaces.keys())
				for (let kbd of kbds)
					if (kbd.innerText == spaces[j].innerText)
					{
						if (kbd.classList.contains("wrong") || kbd.classList.contains("right"))
							break

						if (kbd.classList.contains("near"))
						{
							if (check_result[j] != "right")
								break

							kbd.classList.remove("near")
						}
						kbd.classList.add(check_result[j])
						break
					}
		}

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
		//Target word not loaded
		if (this.target === null)
			return

		//There is any editing row
		let spaces = document.querySelectorAll(".edit_row>.letter_space")
		if (!spaces.length)
			return

		//All letters ok
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
		{
			let row = document.querySelector(".edit_row")
			row.style.animation = null
			row.offsetHeight
			row.style.animation = "shake 0.25s ease-in-out"
			return
		}

		let anim_duration = .5
		for (let i of spaces.keys())
			spaces[i].style.animation = "reveal_letter "+anim_duration+"s linear "+anim_duration*i/3+"s both"

		//Add accents and denormalize word
		result = result[0].values[0][0]
		for (let i = 0; i < result.length; i++)
			spaces[i].innerText = result[i]

		//Show to user on gameboard
		let check_result = this.check_word(word)
		for (let i of spaces.keys())
			spaces[i].classList.add(check_result[i])

		//Show to user on keyboard
		let kbds = document.querySelectorAll("kbd.letter")
		for (let i of spaces.keys())
			for (let kbd of kbds)
				if (kbd.innerText == spaces[i].innerText)
				{
					if (kbd.classList.contains("wrong") || kbd.classList.contains("right"))
						break

					let anim_name = "reveal_key"
					if (kbd.classList.contains("near"))
					{
						if (check_result[i] != "right")
							break

						anim_name = "reveal_key_from_near"
						kbd.classList.remove("near")
					}
					kbd.classList.add(check_result[i])
					kbd.style.animation = anim_name + " .25s ease-in "+anim_duration*7/3+"s both"
					break
				}

		//If has won
		if (this.target.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() == word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())
		{
			this.finish()
			return
		}

		switch_row()

		const next_edit = document.querySelector(".edit_row>.letter_space")
		if (next_edit)
			this.switch_edit(next_edit)
		else
			this.finish()
	}

	this.backspace = function()
	{
		//There is any editing row
		let spaces = document.querySelectorAll(".edit_row>.letter_space")
		if (!spaces.length)
			return

		//Cursor is in postion
		let cursor_pos = false
		for (let i of spaces.keys())
			if (spaces[i].classList.contains("edit_letter"))
			{
				cursor_pos = i
				break
			}

		//Remove self
		if (cursor_pos !== false && spaces[cursor_pos].innerText)
		{
			spaces[cursor_pos].innerText = ""
			spaces[cursor_pos].style.animation = null
			spaces[cursor_pos].offsetHeight
			spaces[cursor_pos].style.animation = "rm_letter 0.15s ease-in-out"
			return
		}

		//Remove before
		if (cursor_pos > 0)
		{
			spaces[cursor_pos-1].innerText = ""
			spaces[cursor_pos-1].style.animation = null
			spaces[cursor_pos-1].offsetHeight
			spaces[cursor_pos-1].style.animation = "rm_letter 0.15s ease-in-out"
			this.switch_edit(spaces[cursor_pos-1])
			return
		}

		//No cursor removes at the end
		if (cursor_pos !== 0)
		{
			let last_space = spaces[spaces.length - 1]
			last_space.innerText = ""
			last_space.style.animation = null
			last_space.offsetHeight
			last_space.style.animation = "rm_letter 0.15s ease-in-out"
			this.switch_edit(last_space)
			return
		}
	}

	this.finish = function()
	{
		//Get current row
		let current_row = 6
		const rows = document.querySelectorAll("#board>.row")
		for (let i of rows.keys())
			if (rows[i].classList.contains("edit_row"))
			{
				current_row = i
				break
			}

		//Update stats
		this.stats.games[current_row]++
		if (current_row == 6)
			this.stats.sequence = 0
		else
			this.stats.sequence++
		if (this.stats.sequence > this.stats.best_sequence)
			this.stats.best_sequence = this.stats.sequence

		//Opens stats and remove cursor
		setTimeout(this.open_stats, 2000);
		switch_row(false)
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

	this.save_cookie = function()
	{
		//Save stats
		const expires = new Date()
		expires.setFullYear(expires.getFullYear() + 10)
		document.cookie = "stats="+encodeURI(JSON.stringify(this.stats))+";expires="+expires.toUTCString()+";path/;"
		console.info("Saved")

		//Save current game
		let tomorrow = new Date()
		tomorrow.setDate(tomorrow.getDate()+1);
		tomorrow.setHours(0)
		tomorrow.setMinutes(0)
		tomorrow.setSeconds(0)

		//Set empty game setting
		const game =
		{
			rows: [],
			current_row: null
		}

		//Save word and check results
		const rows = document.querySelectorAll("#board > .row")
		for (i of rows.keys())
		{
			if (rows[i].classList.contains("edit_row"))
			{
				game.current_row = i
				break
			}

			const spaces = rows[i].querySelectorAll(".letter_space")
			if (spaces[0].innerText === "")
				break

			let word = ""
			for (const space of spaces)
				word += space.innerText

			game.rows.push(word)
		}
		document.cookie = "game="+encodeURI(JSON.stringify(game))+";expires="+tomorrow.toUTCString()+";path/;"
	}

	this.load_cookie = function()
	{
		//Load stats
		let stats = decodeURIComponent(document.cookie).match(/(^|;)\s*stats\s*=\s*([^;]+)/)?.pop() || ''
		if (stats)
			this.stats = JSON.parse(stats)

		//Load current game
		let game = decodeURIComponent(document.cookie).match(/(^|;)\s*game\s*=\s*([^;]+)/)?.pop() || ''
		if (game)
		{
			game = JSON.parse(game)

			//Set current edit row
			document.querySelector(".edit_row").classList.remove("edit_row")
			if (game.current_row)
				document.querySelectorAll("#board > .row")[game.current_row].classList.add("edit_row")

			//Set first edit letter
			next_edit = document.querySelector(".edit_row>.letter_space")
			this.switch_edit(next_edit)

			//Load typed words
			const rows = document.querySelectorAll("#board > .row");
			for (i of rows.keys())
			{
				//If does not has row
				if (!game.rows[i]) break

				//Set letters on place
				const spaces = rows[i].querySelectorAll(".letter_space")
				for (const j of spaces.keys())
					spaces[j].innerText = game.rows[i][j]

				/*
				//Set letters check result on gameboard
				let check_result = this.check_word(game.rows[i])
				for (const j of spaces.keys())
					spaces[j].classList.add(check_result[j])

				//Set letters check result on keyboard
				let kbds = document.querySelectorAll("kbd.letter")
				for (let j of spaces.keys())
					for (let kbd of kbds)
						if (kbd.innerText == game.rows[i][j].innerText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().split(''))
						{
							if (kbd.classList.contains("wrong") || kbd.classList.contains("right"))
								break

							let anim_name = "reveal_key"
							if (kbd.classList.contains("near"))
							{
								if (check_result[i] != "right")
									break

								anim_name = "reveal_key_from_near"
								kbd.classList.remove("near")
							}
							kbd.classList.add(check_result[j])
							kbd.style.animation = anim_name + " .25s ease-in "+anim_duration*7/3+"s both"
							break
						}
				*/
			}
		}
	}
	this.load_cookie()

	//Header buttons
	this.update_stats = function()
	{
		const bars = document.querySelectorAll("#stats .progress")
		let games = Object.values(this.stats.games).reduce((partialSum, a) => partialSum + a, 0);
		let max = Math.max.apply(null, Object.values(this.stats.games))

		//Set progresses
		document.querySelector("#games").innerText = games
		document.querySelector("#victory_rate").innerText = "0%"
		if (max != 0)
			document.querySelector("#victory_rate").innerText = Math.round((1-this.stats.games[6]/games)*100)+"%"
		document.querySelector("#victory_sequence").innerText = this.stats.sequence
		document.querySelector("#best_victory_sequence").innerText = this.stats.best_sequence

		//Set values on bars
		for (let i of bars.keys())
			bars[i].querySelector("span").innerText = this.stats.games[i]

		//Set bars width
		for (let i of bars.keys())
			if (this.stats.games[i] == 0)
			{
				bars[i].style.width = "0%"
				bars[i].style.backgroundColor = "var(--background-color)"
			}
			else
			{
				bars[i].style.width = this.stats.games[i]/max*100+"%"
				bars[i].style.backgroundColor = ""
			}
	}

	this.update_timer = function()
	{
		let tomorrow = new Date()
		tomorrow.setDate(tomorrow.getDate()+1);
		tomorrow.setHours(0)
		tomorrow.setMinutes(0)
		tomorrow.setSeconds(0)
		let delta_time = tomorrow-new Date()
		
		document.querySelector("#timer").innerText = Math.floor(delta_time/1000/3600).toString().padStart(2, '0')+':'+
		Math.floor(delta_time/1000/60%60).toString().padStart(2, '0')+':'+Math.floor(delta_time/1000 - Math.floor(delta_time/1000/60)*60).toString().padStart(2, '0')
	}
	setInterval(update_timer, 1000);

	this.open_stats = function()
	{
		update_stats()
		document.querySelector("#stats").style.display = "flex"
	}

	//Open
	document.querySelector("#stats-button").addEventListener("click", this.open_stats, false);
	document.querySelector("#help-button").addEventListener("click", function(){
		document.querySelector("#help").style.display = "flex"
	}, false);

	//Close
	document.querySelector("#stats").addEventListener("click", function(){
		document.querySelector("#stats").style.display = "none"
		}, false);
	document.querySelector("#help").addEventListener("click", function(){
		document.querySelector("#help").style.display = "none"
		}, false);
}
Game()