Input = function()
{
	this.KeyDown = function(event)
	{
		if (event.keyCode >= 65 && event.keyCode <= 90)
			this.add_letter(String.fromCharCode(event.which))
		else if (event.code == "Enter")
			this.enter()
		else if (event.code == "Backspace")
			this.backspace()
	}

	this.add_letter = function(letter)
	{
		let edit_letter = document.querySelector(".edit_letter")
		if (edit_letter)
		{
			edit_letter.innerText = letter;
			this.switch_edit(document.querySelector(".edit_letter+.letter_space"))
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

	this.enter = function()
	{
		let spaces = document.querySelectorAll(".edit_row>.letter_space")
		for (space of spaces)
			if (space.innerText == "")
				return
		switch_row()
		for (space of spaces)
			space.classList.add("right")
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
	for (space of spaces)
		space.addEventListener("click", (e) => {
			if (e.target.parentElement.classList.contains("edit_row"))
				this.switch_edit(e.target)
		}, false);

	//Virtual keyboard
	let keys = document.querySelectorAll("kbd.letter");
	for (key of keys)
		key.addEventListener("click", (e) => this.add_letter(e.target.innerText), false);
	document.querySelector("#kbd_enter").addEventListener("click", (e) => this.enter(), false);
	document.querySelector("#kbd_backspace").addEventListener("click", (e) => this.backspace(), false);
}
Input()
