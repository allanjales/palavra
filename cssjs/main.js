Game = function()
{
	this.target
	this.start_date = new Date('2022-02-18 00:00:00')
	this.diff_days
	this.db

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
			
			this.diff_days = Math.floor((new Date()-this.start_date) / (1000 * 60 * 60 * 24))
			let length = this.db.exec('SELECT COUNT(*) FROM words_list')[0].values[0][0]
			this.target = this.db.exec('SELECT word FROM words_list LIMIT 1 OFFSET $id', {$id: this.diff_days%length})[0].values[0][0]
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
		else if (event.keyCode == 37)
			cursor_walk(-1)
		else if (event.keyCode == 39)
			cursor_walk(1)
	}

	this.cursor_walk = function(direction)
	{
		cursor_pos = null
		let spaces = document.querySelectorAll(".edit_row .letter_space")
		for (i of spaces.keys())
		{
			if (spaces[i].classList.contains("edit_letter"))
				cursor_pos = i

			spaces[i].classList.remove("edit_letter")
		}

		if (cursor_pos !== null)
		{
			new_pos = (cursor_pos+direction+5)%5
			spaces[new_pos].classList.add("edit_letter")
			return
		}
		
		if (spaces)
			spaces[i].classList.add("edit_letter")

	}

	this.add_letter = function(letter)
	{
		if (!this.is_finished())
			this.hide_notification()

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
		let word = ""
		for (i of rows.keys())
		{
			//Get row word
			const spaces = rows[i].querySelectorAll(".letter_space")
			word = ""
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
			let kbds = document.querySelectorAll("#keyboard > button.letter")
			for (let j of spaces.keys())
			{
				for (let kbd of kbds)
					if (kbd.innerText == spaces[j].innerText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase())
					{
						if (kbd.classList.contains("right"))
							break

						if (kbd.classList.contains("wrong") && check_result[j] === "wrong")
							break

						if (kbd.classList.contains("near"))
						{
							if (check_result[j] != "right")
								break
							kbd.classList.remove("near")
						}
						kbd.classList.remove("wrong")
						kbd.classList.add(check_result[j])
						break
					}
			}
		}

		//If lost
		if (this.check_word(word))
			this.show_notification("Palavra certa: "+this.target)
	}

	this.space = function()
	{
		if (!this.is_finished())
			this.hide_notification()

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
		if (!this.is_finished())
			this.hide_notification()

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
			{
				let row = document.querySelector(".edit_row")
				row.style.animation = null
				row.offsetHeight
				row.style.animation = "shake 0.25s ease-in-out"
				this.show_notification("A palavra deve ter 5 letras")
				return
			}
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
			this.show_notification("Essa palavra não é aceita")
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
		let kbds = document.querySelectorAll("#keyboard > button.letter")
		for (let i of spaces.keys())
			for (let kbd of kbds)
				if (kbd.innerText == spaces[i].innerText.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase())
				{
					if (kbd.classList.contains("right"))
						break

					if (kbd.classList.contains("wrong") && check_result[i] === "wrong")
						break
					else
						kbd.classList.remove("near")

					if (kbd.classList.contains("near"))
					{
						if (check_result[i] != "right")
							break
						kbd.classList.remove("near")
					}
					kbd.classList.remove("wrong")
					kbd.classList.add(check_result[i])
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
		{
			let row = document.querySelector("#board > .row:last-child")
			row.style.animation = null
			row.offsetHeight
			row.style.animation = "shake 0.25s ease-in-out "+anim_duration*(5/3+1)+"s"
			this.finish()
		}
	}

	this.backspace = function()
	{
		if (!this.is_finished())
			this.hide_notification()
		
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

		//Notify
		if (current_row < 6)
		{
			let phrases = ["Fantástico", "Sensacional", "Incrível", "Genial", "Parabéns", "Impressionante", "Boa!", "Espetacular"]
			if (current_row == 0)
				phrases = ["De primeira", "Sorte?"]
			else if (current_row == 5)
				phrases = ["Ufa", "Essa foi por pouco", "Quase"]
			this.show_notification(phrases[Math.floor(Math.random()*phrases.length)], .5*11/3)
		}
		else
			this.show_notification("Palavra certa: "+this.target, .5*11/3)


		//Opens stats and remove type cursor
		setTimeout(this.open_stats, 2500);
		switch_row(false)
	}

	//Check if game is finished or not
	this.is_finished = function()
	{
		if (document.querySelector(".edit_row"))
			return false
		return true
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
	let keys = document.querySelectorAll("#keyboard > button.letter");
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
			const next_edit = document.querySelector(".edit_row>.letter_space")
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
			}

			//If has finished
			if (this.is_finished())
				this.open_stats()
		}

		if (!game && !stats)
			this.open_help()
	}

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

		if (this.is_finished())
			document.querySelector("#share_button").style.display = ""
		else
			document.querySelector("#share_button").style.display = "none"

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

	this.open_help = function()
	{
		document.querySelector("#help").style.display = "flex"
	}

	this.close_modals = function(event)
	{
		if (event && event.target.tagName === "BUTTON")
			return
		document.querySelector("#help").style.display = "none"
		document.querySelector("#stats").style.display = "none"
	}

	//Open
	document.querySelector("#stats-button").addEventListener("click", this.open_stats, false);
	document.querySelector("#help-button").addEventListener("click", this.open_help, false);

	//Close
	document.querySelector("#stats").addEventListener("click", (e) => this.close_modals(e), false);
	document.querySelector("#help").addEventListener("click", (e) => this.close_modals(e), false);

	this.share = function()
	{
		const rows = document.querySelectorAll("#board > .row");
		let content = ""
		let trys = "X"
		word_loop: for (i of rows.keys())
		{
			//Get row word
			const spaces = rows[i].querySelectorAll(".letter_space")
			let word = ""
			for (const space of spaces)
			{
				if (space.innerText == "")
					break word_loop
				word += space.innerText
			}

			//Get check of word
			let check_result = this.check_word(word)

			//Add to content
			content += "\n"
			for (result of check_result)
			{
				switch (result)
				{
					case ("right"):
						content += "🟩"
						break
					case ("near"):
						content += "🟨"
						break
					case ("wrong"):
						content += "⬛"
						break
					default:
						content += "?"
						break
				}
			}

			if (check_result.every((val, i, arr) => val === "right"))
				trys = i+1
		}
		let text = "joguei Palavra! #"+this.diff_days+" ("+trys+"/6)\n"+content+"\n\nallanjales.github.io/palavra"

		//Sharing action
		if (window.mobileAndTabletCheck() && navigator.share)
		{
			navigator.share({
				title: 'Palavra',
				text: text
			})
			.then(() => this.show_notification("Compartilhamento feito", 0, 5))
			.catch((error) => this.show_notification("Falha no compartilhamento", 0, 5))
		}
		else
		{
			navigator.clipboard.writeText(text)
			.then(() => this.show_notification("Copiado para a área de transferência", 0, 5))
			.catch((error) => this.show_notification("Não foi possível copiar para a área de transferência", 0, 5));
		}
	}

	document.querySelector("#share_button").addEventListener("click", (e) => this.share(), false);

	this.load_cookie()
}

this.show_notification = function(text, delay = 0, duration = -1)
{
	const notification = document.querySelector("#notification")
	notification.innerText = text
	notification.style.setProperty('--scale-notification', 1)
	notification.style.animation = null
	notification.offsetHeight
	notification.style.animation = "show_notification 0.15s linear both "+delay+"s"
	if (duration > 0)
		setTimeout(this.hide_notification, (delay+duration)*1000);
}

this.hide_notification = function(delay = 0)
{
	const notification = document.querySelector("#notification")
	if (getComputedStyle(notification).getPropertyValue('--scale-notification') != 0)
	{
		notification.style.setProperty('--scale-notification', 0)
		notification.style.animation = null
		notification.offsetHeight
		notification.style.animation = "hide_notification 0.15s linear both "+delay+"s"
	}
}

window.mobileAndTabletCheck = function() {
	let check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
};

Game()