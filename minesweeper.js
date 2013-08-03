if ("undefined" === typeof(MineSweeper)) {
	MineSweeper = {};
}

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
	width: function() {
		return this.table[0].rows[0].cells.length;
	},
	height: function() {
		return this.table[0].rows.length;
	},
	getCell: function(r, c) {
		return $(this.table[0].rows[r].cells[c]);
	},
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
	nextNonMine: function(r, c) {
		var rr, cc;
		// Search forward from starting point to end of board
		for (rr = r; rr < this.height(); rr++) {
			for (cc = c; cc < this.width(); cc++) {
				if (!this.getCell(rr, cc).hasClass('mine')) {
					return [rr, cc];
				}
			}
		}
		// Search forward from start of board to starting point
		for (rr = 0; rr < r; rr++) {
			for (cc = 0; cc < this.width(); cc++) {
				if (!this.getCell(rr, cc).hasClass('mine')) {
					return [rr, cc];
				}
			}
		}
		for (cc = 0; cc < c; cc++) {
			if (!this.getCell(rr, cc).hasClass('mine')) {
				return [rr, cc];
			}
		}
		// No non-mine squares remaining
		return undefined;
	},
	addMines: function() {
		var i, r, c, next;
		for (i = 0; i < this.mineCount; i++) {
			r = randomIntBetween(0, this.height() - 1);
			c = randomIntBetween(0, this.width() - 1);
			next = this.nextNonMine(r, c);
			this.getCell.apply(this, next).addClass('mine');
		}
	},
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
	getMineCount: function() {
		return this.mineCount;
	},
	setMineCount: function(newMineCount) {
		if (newMineCount !== this.mineCount) {
			this.mineCount = newMineCount;
			this.container.trigger(MineSweeper.eventNames.numMinesChanged);
		}
		return this;
	},
	enable: function() {
		if (this.isDisabled()) {
			this.table.addClass('enabled');
			this.container.trigger(MineSweeper.eventNames.flagsUsedChanged);
			this.container.trigger(MineSweeper.eventNames.numMinesChanged);
			this.container.trigger(MineSweeper.eventNames.sizeChanged);
		}
		return this;
	},
	disable: function() {
		this.table.removeClass('enabled');
		return this;
	},
	isEnabled: function() {
		return this.table.hasClass('enabled');
	},
	isDisabled: function() {
		return !this.isEnabled();
	},
	getFlagsUsed: function() {
		return this.flagsUsed;
	},
	getFlagsLeft: function() {
		return this.mineCount - this.flagsUsed;
	},
	getRevealed: function() {
		return this.height() * this.width() - this.unrevealed;
	},
	getUnRevealed: function() {
		return this.unrevealed;
	},
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
