if ("undefined" === typeof(MineSweeper)) {
	MineSweeper = {};
}

MineSweeper.Board = function(container, rows, cols, mineCount) {
	this.table = $('<table>');
	this.table.addClass('minesweeper');
	this.buildTable(rows, cols);
	this.unrevealed = this.width() * this.height();
	this.mineCount = mineCount;
	this.addMines();
	container.append(this.table);
};

$.extend(MineSweeper.Board.prototype, {
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
	getMineCount: function() {
		return this.mineCount;
	},
	setMineCount: function(newMineCount) {
		this.mineCount = newMineCount;
		return this;
	},
	buildTable: function(rows, cols) {
		var board = this, r, c, row, cell, cw = Math.floor(100 / cols), ch = Math.floor(100 / rows);
		this.table.empty();
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
			this.table.append(row);
		}
		this.table.on('click', 'td', function(event) {
			board.revealSquare($(this).data('r'), $(this).data('c'));
			return false;
		}).on('contextmenu', 'td', function(event) {
			board.toggleFlag($(this).data('r'), $(this).data('c'));
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
				callback(rr, cc);
			}
		}
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
		var board = this, mines, cell = this.getCell(r, c);
		if (cell.hasClass('flag') || cell.hasClass('revealed')) {
			return; // Flagged or already revealed
		}
		this.unrevealed--;
		cell.removeClass('unrevealed').addClass('revealed');
		if (cell.hasClass('mine')) {
			// TODO: Lose
			console.log('You lose!');
			this.revealBoard();
		} else {
			mines = 0;
			this.enumNeighbours(r, c, function(nr, nc) {
				if (board.getCell(nr, nc).hasClass('mine')) {
					mines++;
				}
			});
			if (mines) {
				cell.append(this.makeNumMinesSpan(mines));
			} else {
				this.enumNeighbours(r, c, function(nr, nc) {
					board.revealSquare(nr, nc);
				});
			}
		}
		if (this.unrevealed <= this.mineCount) {
			// TODO: Won
			console.log('You win!');
			this.revealBoard();
		}
	},
	toggleFlag: function(r, c) {
		var cell = this.getCell(r, c);
		if (cell.hasClass('flag')) {
			cell.removeClass('flag');
			this.flagsUsed--;
		} else {
			if (this.flagsUsed >= this.mineCount) {
				return; // All flags already used
			}
			cell.addClass('flag');
			this.flagsUsed++;
		}
	},
	revealBoard: function() {
		var r, c, cell;
		for (r = 0; r < this.height(); r++) {
			for (c = 0; c < this.width(); c++) {
				cell = this.getCell(r, c);
				if (cell.hasClass('flag')) {
					cell.addClass(cell.hasClass('mine') ? 'correct' : 'incorrect');
				} else {
					cell.removeClass('unrevealed').addClass('revealed');
				}
			}
		}
	}
});
