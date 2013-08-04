if ("undefined" === typeof(MineSweeper)) {
	MineSweeper = {};
}

/**
 * A MineSweeper board.
 * @param container The element inside which the board will be placed
 * @param rows Number of rows in board
 * @param cols Number of columns in board
 * @param mineCount How many mines to place on the board
 * @returns {MineSweeper.Board} The newly-created Board instance
 */
MineSweeper.Board = function(container, rows, cols, mineCount) {
	this.container = container;
	this.table = $('<table>');
	this.table.addClass('minesweeper');
	this.buildTable(rows, cols);
	this.unrevealed = this.width() * this.height();
	this.mineCount = mineCount;
	this.addMines();
	this.container.append(this.table);
	this.enable();
};

$.extend(MineSweeper.Board.prototype, {
	mineCount: 0,
	flagsUsed: 0,
	/**
	 * Return the width in columns of this board
	 * @returns Width of board in columns
	 */
	width: function() {
		return this.table[0].rows[0].cells.length;
	},
	/**
	 * Return the height in rows of this board
	 * @returns Height of board in rows
	 */
	height: function() {
		return this.table[0].rows.length;
	},
	/**
	 * Retrieve the cell at the given co-ordinates.
	 * @param r The cell's row
	 * @param c The cell's column
	 * @returns The cell at the given row and column
	 */
	getCell: function(r, c) {
		return $(this.table[0].rows[r].cells[c]);
	},
	/**
	 * Populate the board, by creating an HTML table of clickable squares.
	 * @param rows Height of board in rows
	 * @param cols Width of board in columns
	 */
	buildTable: function(rows, cols) {
		var board = this, r, c, row, cell, cw = Math.floor(100 / cols), ch = Math.floor(100 / rows);
		board.table.off('click', 'td');
		board.table.off('contextmenu', 'td');
		board.table.empty();
		for (r = 0; r < rows; r++) {
			row = $('<tr>');
			row.css('height', ch + '%');
			for (c = 0; c < cols; c++) {
				cell = $('<td>');
				cell.addClass('unrevealed')
				.css('width', cw + '%')
				.data('r', r).data('c', c);
				row.append(cell);
			}
			board.table.append(row);
		}
		board.table.on('click', 'td', function(event) {
			board.container.trigger(MineSweeper.eventNames.startGame);
			if (board.isEnabled()) {
				board.revealSquare($(this).data('r'), $(this).data('c'));
			}
			return false;
		}).on('contextmenu', 'td', function(event) {
			board.container.trigger(MineSweeper.eventNames.startGame);
			if (board.isEnabled()) {
				board.toggleFlag($(this).data('r'), $(this).data('c'));
			}
			return false;
		});
	},
	/**
	 * Find the first square at or after the given co-ordinates
	 * that does not currently contain a mine.
	 * Return that square's row and column in a two-element array,
	 * or undefined if no such square was found.
	 * Use of this algorithm in placing mines causes clustering,
	 * but that is not necessarily a bad thing.
	 * @param r Starting row
	 * @param c Starting column
	 * @returns [r, c] of found non-mine square
	 */
	nextNonMine: function(r, c) {
		var rr, cc;
		// Search forward from starting point to end of same row
		for (rr = r, cc = c; cc < this.width(); cc++) {
			if (!this.getCell(rr, cc).hasClass('mine')) {
				return [rr, cc];
			}
		}
		// Search forward until end of board
		for (rr = r + 1; rr < this.height(); rr++) {
			for (cc = 0; cc < this.width(); cc++) {
				if (!this.getCell(rr, cc).hasClass('mine')) {
					return [rr, cc];
				}
			}
		}
		// Search forward from start of board to starting row
		for (rr = 0; rr < r; rr++) {
			for (cc = 0; cc < this.width(); cc++) {
				if (!this.getCell(rr, cc).hasClass('mine')) {
					return [rr, cc];
				}
			}
		}
		// Search starting row before starting column
		for (cc = 0; cc < c; cc++) {
			if (!this.getCell(rr, cc).hasClass('mine')) {
				return [rr, cc];
			}
		}
		// No non-mine squares remaining
		return undefined;
	},
	/**
	 * Add this.mineCount mines to this board,
	 * [pseudo-]randomly distributed across it.
	 */
	addMines: function() {
		var i, r, c, next;
		for (i = 0; i < this.mineCount; i++) {
			r = randomIntBetween(0, this.height() - 1);
			c = randomIntBetween(0, this.width() - 1);
			next = this.nextNonMine(r, c);
			this.getCell.apply(this, next).addClass('mine');
		}
	},
	/**
	 * Enumerate the neighbours (including diagonals) of the given square.
	 * @param r The square's row
	 * @param c The square's column
	 * @param callback Function to call with neighbour co-ordinates
	 * @returns this
	 */
	enumNeighbours: function(r, c, callback) {
		var rr, cc;
		for (rr = Math.max(r - 1, 0); rr <= Math.min(r + 1, this.height() - 1); rr++) {
			for (cc = Math.max(c - 1, 0); cc <= Math.min(c + 1, this.width() - 1); cc++) {
				if (rr === r && cc === c) {
					continue; // Skip existing square
				}
				if (!callback(rr, cc)) {
					return this; // Terminate enumeration
				}
			}
		}
		return this;
	},
	/**
	 * Create a span to go in a revealed square.
	 * If no neighbouring mines, it is blank.
	 * Otherwise, it contains the number of neighbouring mines.
	 * @param n Count of neighbouring mines
	 * @returns The newly-created <span>
	 */
	makeNumMinesSpan: function(n) {
		var span = $('<span>');
		if (n) {
			span.append('' + n);
		} else {
			span.append(' ');
		}
		span.addClass('mines' + n); // Numbers-only not a valid CSS class name
		return span;
	},
	/**
	 * Reveal a square. If it has zero neighbour mines, also reveal its neighbours.
	 * @param r The square's row
	 * @param c The square's column
	 * @returns this
	 */
	revealSquare: function(r, c) {
		var board = this, mines, cell;
		cell = this.getCell(r, c);
		if (cell.hasClass('flag') || cell.hasClass('revealed')) {
			return this; // Flagged or already revealed
		}
		this.unrevealed--;
		cell.removeClass('unrevealed').addClass('revealed');
		if (cell.hasClass('mine')) {
			// TODO: Lose
			$().toastmessage('showNoticeToast', 'You lose!');
			this.disable();
			this.revealBoard(false);
			this.container.trigger(MineSweeper.eventNames.lostGame);
		} else {
			mines = 0;
			board.enumNeighbours(r, c, function(nr, nc) {
				if (board.getCell(nr, nc).hasClass('mine')) {
					mines++;
				}
				return true;
			});
			if (mines > 0) {
				// Show count of neighbouring mines and stop.
				cell.append(this.makeNumMinesSpan(mines));
			} else {
				// No neighbouring mines. Reveal all neighbour squares.
				board.enumNeighbours(r, c, function(nr, nc) {
					board.revealSquare(nr, nc);
					return true;
				});
			}
		}
		if (this.unrevealed <= this.mineCount && this.isEnabled()) {
			// TODO: Won
			$().toastmessage('showNoticeToast', 'You win!');
			this.disable();
			this.revealBoard(true);
			this.container.trigger(MineSweeper.eventNames.wonGame);
		}
		return this;
	},
	/**
	 * Add/remove a flag from the given square, depending n whether
	 * or not it is already flagged.
	 * @param r The square's row
	 * @param c The square's column
	 * @returns this
	 */
	toggleFlag: function(r, c) {
		var cell;
		cell = this.getCell(r, c);
		if (cell.hasClass('flag')) {
			cell.removeClass('flag');
			this.flagsUsed--;
			this.container.trigger(MineSweeper.eventNames.flagsUsedChanged);
		} else if (this.flagsUsed >= this.mineCount) {
			$().toastmessage('showNoticeToast', 'No flags left');
		} else {
			cell.addClass('flag');
			this.flagsUsed++;
			this.container.trigger(MineSweeper.eventNames.flagsUsedChanged);
		}
		return this;
	},
	/**
	 * Reveal the entire board and all of its squares.
	 * @param autoFlagMines If true, automatically flag revealed mines
	 * @returns this
	 */
	revealBoard: function(autoFlagMines) {
		var r, c, cell;
		for (r = 0; r < this.height(); r++) {
			for (c = 0; c < this.width(); c++) {
				cell = this.getCell(r, c);
				if (cell.hasClass('flag')) {
					cell.addClass(cell.hasClass('mine') ? 'correct' : 'incorrect');
				} else if (autoFlagMines && cell.hasClass('mine')) {
					cell.addClass('flag').addClass('correct');
					this.flagsUsed++;
					this.container.trigger(MineSweeper.eventNames.flagsUsedChanged);
				} else {
					cell.removeClass('unrevealed').addClass('revealed');
				}
			}
		}
		return this;
	},
	/**
	 * Return the number of mines on this board
	 * @returns {Number} The number of mines on this board
	 */
	getMineCount: function() {
		return this.mineCount;
	},
	/**
	 * Set the number of mines on this board.
	 * @param newMineCount New number of mines on board
	 * @returns this
	 */
	setMineCount: function(newMineCount) {
		if (newMineCount !== this.mineCount) {
			this.mineCount = newMineCount;
			this.container.trigger(MineSweeper.eventNames.numMinesChanged);
		}
		return this;
	},
	/**
	 * Begin responding to user input. Additionally, synthesis change events
	 * for the board's most interesting parameters, to update an attached UI.
	 * @returns this;
	 */
	enable: function() {
		if (this.isDisabled()) {
			this.table.addClass('enabled');
			this.container.trigger(MineSweeper.eventNames.flagsUsedChanged);
			this.container.trigger(MineSweeper.eventNames.numMinesChanged);
			this.container.trigger(MineSweeper.eventNames.sizeChanged);
		}
		return this;
	},
	/**
	 * Cease responding to user input, for example if the game is over.
	 * @returns this
	 */
	disable: function() {
		this.table.removeClass('enabled');
		return this;
	},
	/**
	 * Return true iff the board is enabled, false otherwise.
	 * @returns {Bool} true iff the board is enabled, false otherwise
	 */
	isEnabled: function() {
		return this.table.hasClass('enabled');
	},
	/**
	 * Return true iff the board is disabled, false otherwise.
	 * @returns {Bool} true iff the board is disabled, false otherwise
	 */
	isDisabled: function() {
		return !this.isEnabled();
	},
	/**
	 * Return the number of flags currently placed on the board
	 * @returns {Number} Count of flags currently placed on the board
	 */
	getFlagsUsed: function() {
		return this.flagsUsed;
	},
	/**
	 * Return the number of flags available to be placed on the board
	 * @returns {Number} Count of flags available to be placed on the board
	 */
	getFlagsLeft: function() {
		return this.mineCount - this.flagsUsed;
	},
	/**
	 * Returns the number of revealed squares. 
	 * @returns {Number} Count of revealed squares
	 */
	getRevealed: function() {
		return this.height() * this.width() - this.unrevealed;
	},
	/**
	 * Returns the number of unrevealed squares. 
	 * @returns {Number} Count of unrevealed squares
	 */
	getUnRevealed: function() {
		return this.unrevealed;
	},
	/**
	 * Reset the board back to its original (or new) state. 
	 * @returns {Number} Count of revealed squares
	 */
	reset: function() {
		this.unrevealed = this.height() * this.width();
		this.flagsUsed = 0;
		this.buildTable(this.height(), this.width());
		this.addMines();
		this.enable();
		return this;
	}
});

MineSweeper.eventNames = {
	startGame: 'MineSweeper.startGame',
	wonGame: 'MineSweeper.wonGame',
	lostGame: 'MineSweeper.lostGame',
	flagsUsedChanged: 'MineSweeper.flagsUsedChanged',
	numMinesChanged: 'MineSweeper.numMinesChanged',
	sizeChanged: 'MineSweeper.sizeChanged'
};
