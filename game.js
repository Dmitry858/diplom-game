'use strict';
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  plus(vector) {
    if(!(vector instanceof Vector)) {
      throw new Error ('Переданный объект не является объектом класса Vector');
    } 
    return new Vector(vector.x + this.x, vector.y + this.y);
  }
  times(factor) {
    return new Vector(this.x * factor, this.y * factor);
  }
}

class Actor {
	constructor(pos = new Vector(), size = new Vector(1, 1), speed = new Vector()) {
		if (!(pos instanceof Vector) || !(size instanceof Vector) || !(speed instanceof Vector)) {
			throw new Error ('Один из переданных объектов не является объектом класса Vector');
		}
		this.pos = pos;
		this.size = size;
		this.speed = speed;
	}
	act() {}
	get left() {
		return this.pos.x;
	}
	get top() {
		return this.pos.y;
	}
	get right() {
		return this.pos.x + this.size.x;
	}
	get bottom() {
		return this.pos.y + this.size.y;
	}
	get type() {
		return 'actor';
	}
	isIntersect(actor) {
		if (!(actor instanceof Actor)) {
			throw new Error ('Переданный объект не является объектом класса Actor, либо объект не передан');
		}
		if (actor === this) {
			return false;
		}
		return (actor.left < this.right && actor.right > this.left && actor.top < this.bottom && actor.bottom > this.top);
	}
}

class Level {
	constructor(grid = [], actors = []) {
		let player = actors.find(function(el) {
			return el.type == 'player';
		})
		this.grid = grid;
		this.actors = actors;
		this.player = player;
		this.height = this.grid.length;
		this.width = Math.max(0, ...this.grid.map(x => x.length));
		this.status = null;
		this.finishDelay = 1;
	}
	isFinished() {
		if (this.status !== null && this.finishDelay < 0) {
			return true;
		}
		return false;
	}
	actorAt(actor) {
		if (!(actor instanceof Actor) || actor === undefined) {
			throw new Error ('Переданный объект не является объектом класса Actor, либо объект не передан');
		}
		return this.actors.find(function(el) {
			return el.isIntersect(actor);
		});
	}
	obstacleAt(pos, size) {
		try {
			if (!(pos instanceof Vector) || !(size instanceof Vector)) {
				throw 'Переданный объект не является объектом класса Vector';
			}
			if (pos.x < 0 || pos.y < 0 || (pos.x + size.x) > this.width) {
				return 'wall';
			}
			if ((pos.y + size.y) > this.height) {
				return 'lava';
			}
			for (let i = Math.floor(pos.y); i < Math.ceil(pos.y + size.y); i++) {
				for (let t = Math.floor(pos.x); t < Math.ceil(pos.x + size.x); t++) {
					if (this.grid[i][t] !== undefined) {
						return this.grid[i][t];
					}
				}
			}
		} catch(err) {
			console.log(`Ошибка: ${err}`);
		}
	}
	removeActor(actor) {
		let index = this.actors.indexOf(actor);
		if (index !== -1) {
			this.actors.splice(index, 1);
		}
	}
	noMoreActors(type) {
		return !this.actors.some(el => el.type === type);
	}
	playerTouched(obstacleType, touchedObj) {
		if (this.status !== null) {
			return;
		}
		if (obstacleType === 'lava' || obstacleType === 'fireball') {
			this.status = 'lost';
			return;
		}
		if (obstacleType === 'coin') {
			this.removeActor(touchedObj);
		}
		if (this.noMoreActors('coin')) {
			this.status = 'won';
		}
	}	
}

class LevelParser {
	constructor(dict) {
		this.dict = dict;
	}
	actorFromSymbol(symb = undefined) {
		if (symb !== undefined && this.dict !== undefined) {
			return this.dict[symb];
		}
	}
	obstacleFromSymbol(symb) {
		if (symb === 'x') {
			return 'wall';
		}
		if (symb === '!') {
			return 'lava';
		}
	}
	createGrid(arr = []) {
		return arr.map(row => row.split('').map(symb => this.obstacleFromSymbol(symb)));
	}
	createActors(arr) {
		const resultArray = [];
    for (let i = 0; i < arr.length; i++) {
      for (let t = 0; t < arr[i].length; t++) {
        const actor = this.actorFromSymbol(arr[i].charAt(t));
        if (typeof actor === 'function') {
          const person = new actor(new Vector(t, i));
          if (person instanceof Actor) {
            resultArray.push(person);
          }
        }
      }
    }
    return resultArray;
	}
	parse(arr) {
		return new Level(this.createGrid(arr), this.createActors(arr));
	}
}

class Fireball extends Actor {
	constructor(pos, speed) {
		super(pos, speed);
		this.speed = speed;
		this.size = new Vector(1, 1);
	}
	get type() {
		return 'fireball';
	}
	getNextPosition(time = 1) {
		return this.pos.plus(this.speed.times(time));
	}
	handleObstacle() {
		this.speed['x'] = -this.speed['x'];
		this.speed['y'] = -this.speed['y'];
	}
	act(time, level) {
		let newPos = this.getNextPosition(time);
		let test = level.obstacleAt(newPos, this.size);
		if (test === undefined) {
			this.pos['x'] = newPos['x'];
			this.pos['y'] = newPos['y'];
		} else {
			this.handleObstacle();
		}
	}
}

class HorizontalFireball extends Fireball {
	constructor(pos, speed, size) {
		super(pos, size);
		this.speed = new Vector(2, 0);
	}
}

class VerticalFireball extends Fireball {
	constructor(pos, speed, size) {
		super(pos, size);
		this.speed = new Vector(0, 2);
	}
}

class FireRain extends Fireball {
	constructor(pos, speed, size) {
		super(pos, size);
		this.speed = new Vector(0, 3);
    this.startPos = pos;
	}
	handleObstacle() {
		this.pos = this.startPos;
	}
}

class Coin extends Actor {
	constructor(pos) {
		super(pos);
		this.pos = new Vector(this.pos['x'] + 0.2, this.pos['y'] + 0.1);
		this.size = new Vector(0.6, 0.6);
		this.springSpeed = 8;
		this.springDist = 0.07;
		this.spring = Math.random() * Math.PI * 2;
		this.startPos = this.pos;
	}
	get type() {
		return 'coin';
	}
	updateSpring(time = 1) {
		this.spring = this.spring + this.springSpeed * time;
	}
	getSpringVector() {
		return new Vector(0, Math.sin(this.spring) * this.springDist);
	}
	getNextPosition(time = 1) {
		this.updateSpring(time);
		let springVector = this.getSpringVector(); 
		return this.startPos.plus(springVector);
	}
	act(time) {
		this.pos = this.getNextPosition(time);
	}
}

class Player extends Actor {
	constructor(pos, speed, size) {
		super(pos, speed, size);
		this.pos = new Vector(this.pos['x'], this.pos['y'] - 0.5);
		this.speed = new Vector (0, 0);
		this.size = new Vector(0.8, 1.5);
	}
	get type() {
		return 'player';
	}
}


const actorDict = {
    '@': Player,
    'v': FireRain,
    'o': Coin,
    '=': HorizontalFireball,
    '|': VerticalFireball
}

const parser = new LevelParser(actorDict);

loadLevels().then(levelsStr => {
  const levels = JSON.parse(levelsStr);
  return runGame(levels, parser, DOMDisplay);
}).then(() => {
  alert('Победа!')
});
