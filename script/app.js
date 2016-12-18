// global variables
var pointNum = 0;
var coordX = [];
var coordY = [];
var canvasWidth;
var canvasHeight;
var easing = 'linear';
var speed = 1000;
var terms = [];
var dragSrcEl = null;
var draggables = document.querySelectorAll('#draggables .draggable');
var flgCanvasDown = false;
var mousePos = {x: 0, y: 0};
var targetIndex = -1;
var canvas;
var context;

// 係数の計算
function binomial(n, k) {
	var coef = 1;
	if ((typeof n !== 'number') || (typeof k !== 'number')) {
		return false;
	}
	for (var x = n-k+1; x <= n; x++) {
		coef *= x;
	}
	for (x = 1; x <= k; x++) {
		coef /= x;
	}
	return coef;
}

// 係数をもとに多項式を展開
function setTerms(t) {
	var multiplier = pointNum - 1;
	var a = t;
	var b = (1-t);
	terms = [];
	for(var i = multiplier, j = 0; j <= multiplier; j++) {
		var coef = binomial(i, j);
		terms.push(coef * Math.pow(a, i-j) * Math.pow(b, j));
	}
}

// inputフィールドの値をもとに変数の値を更新
function propInit() {
	var inputCoord = document.getElementsByClassName('inputCoord');
	pointNum = inputCoord.length;
	easing = document.getElementById('easingSelect').value;
	speed = document.getElementById('speed').value;

	coordX = [];
	coordY = [];

	for(var i = 0; i < inputCoord.length; i ++) {
		coordX.push(+inputCoord[i].querySelector('.inputX').value || 0);
		coordY.push(+inputCoord[i].querySelector('.inputY').value || 0);
		// ラベルテキストの更新
		inputCoord[i].querySelector('span').innerHTML = i + 1;
	}
}

// inputフィールドの初期化・イベント登録
function inputInit() {
	var inputs = document.getElementsByClassName('inputItem');
	var select = document.getElementById('easingSelect');
	[].forEach.call(inputs, function(input) {
		input.addEventListener('keyup', onInputChange, false);
	});
	select.addEventListener('change', onSelectChange);
}

// 削除ボタンの初期化・イベント登録
function deleteInit() {
	var items = document.getElementsByClassName('inputCoord');
	[].forEach.call(items, function(item) {
		item.addEventListener('click', onDeleteClick,false);
	});
}

// リプレイボタンの初期化・イベント登録
function replayInit() {
	var replay = document.getElementById('replayBtn');
	replay.addEventListener('click', canvasInit, false);
}

// 追加ボタンの初期化・イベント登録
function addInit() {
	var add = document.getElementById('add');
	add.addEventListener('click', onAddClick, false);
}

// コード出力ボタンの初期化・イベント登録
function outputInit() {
	var output = document.getElementById('outputBtn');
	output.addEventListener('click', onOutputClick, false);
}

// タブの初期化・イベント登録
function tabInit() {
	var tab = document.getElementById('tab');
	tab.addEventListener('click', onTabClick, false);
}

// タブのイベント
function onTabClick(e) {
	if(e.target.nodeName.toLowerCase() === 'span') {
		var tabs =  document.querySelectorAll('.tab span');
		[].forEach.call(tabs, function(tab) {
			tab.classList.remove('current');
		});
		var index = Array.prototype.slice.call(tabs).indexOf(e.target);

		e.target.classList.add('current');

		var textareas = document.querySelectorAll('.tabContent textarea');
		[].forEach.call(textareas, function(textarea) {
			textarea.classList.remove('current');
		});
		textareas[index].classList.add('current');

	}
}

// コード出力イベント
function onOutputClick() {
	outputJS();
	outputJQ();
}

// jQueryコードの出力
function outputJQ() {
	var textarea = document.getElementById('outputJQ');
	textarea.value = '';
	var code = '';

	var tmpEq = [];
	for(var i = pointNum - 1, j = 0; j <= pointNum - 1; j++) {
		var coef = binomial(i, j);
		tmpEq[j] = '';
		tmpEq[j] += (coef === 1 ? '' : coef + ' * ') + 'Math.pow(t, ' + (i-j) + ') * Math.pow((1-t), ' + j + ')';
	}

	// x座標
	code += '$(function() { \n';
	code += '\tvar coordX = [';
	for(var i = 0; i < pointNum; i++) {
		if(i !== pointNum - 1) {
			code += coordX[i] + ',';
		} else {
			code += coordX[i];
		}
	}
	code += '];\n';
	// y座標
	code += '\tvar coordY = [';
	for(var i = 0; i < pointNum; i++) {
		if(i !== pointNum - 1) {
			code += coordY[i] + ',';
		} else {
			code += coordY[i];
		}
	}
	code += '];\n';
	// duration, easing, time..
	code += '\tvar speed = ' + speed + ';\n';
	code += '\tvar easing = \'' + easing + '\';\n';
	code += '\tvar target = $(\'#target\');\n';
	code += '\tvar t = 0;\n';

	// 式の展開関数
	var strBq = '';
	for(var i = 0; i < tmpEq.length; i++) {
		strBq += '\tfunction bq' + i + '() {\n';
		strBq += '\t\treturn ' + tmpEq[i] + ';\n';
		strBq += '\t}\n';
	}

	code += strBq;

	// 数値のイージング・座標変更
	code += '\t$({num: 0})\n';
	code += '\t\t\.animate({num: 1}, {\n';
	code += '\t\t\tduration: speed,\n';
	code += '\t\t\teasing: easing,\n';
	code += '\t\t\tprogress: function(){\n';
	code += '\t\t\t\tt = this.num;\n';

	var strX = '';
	var strY = '';
	for(var i = 0; i < pointNum; i++) {
		strX += 'coordX[' + (pointNum-i-1) + '] * bq' + i + '()';
		if(i !== pointNum - 1) {
			strX += ' + ';
		}

		strY += 'coordY[' + (pointNum-i-1) + '] * bq' + i + '()';
		if(i !== pointNum - 1) {
			strY += ' + ';
		}
	}

	code += '\t\t\t\tx = ' + strX + ';\n';
	code += '\t\t\t\ty = ' + strY + ';\n';
	code += '\t\t\t\ttarget.css({left: x + \'px\'});\n';
	code += '\t\t\t\ttarget.css({top: y + \'px\'});\n';
	code += '\t\t\t}\n';
	code += '\t\t});\n';
	code += '});';

	// 出力
	textarea.value = code;
}

function retEqStr() {
	switch(easing) {
		case 'linear':
			return 'return x';
		case 'easeInQuad':
			return 'return c*(t/=d)*t + b;';
		case 'easeOutQuad':
			return 'return -c*(t/=d)*(t-2) + b;';
		case 'easeInCubic':
			return 'return c * (t/=d)*t*t + b;';
		case 'easeOutCubic':
			return 'return c*((t=t/d-1)*t*t+1) + b;';
		default:
			return 'return x';
	}
}

// JSコードの出力
function outputJS() {
	var textarea = document.getElementById('outputJS');
	textarea.value = '';
	var code = '';

	// 式 bezier equation の文字列を仮生成して保存
	var tmpEq = [];
	for(var i = pointNum - 1, j = 0; j <= pointNum - 1; j++) {
		var coef = binomial(i, j);
		tmpEq[j] = '';
		tmpEq[j] += (coef === 1 ? '' : coef + ' * ') + 'Math.pow(t, ' + (i-j) + ') * Math.pow((1-t), ' + j + ')';
	}

	// x座標
	code += 'var coordX = [';
	for(var i = 0; i < pointNum; i++) {
		if(i !== pointNum - 1) {
			code += coordX[i] + ',';
		} else {
			code += coordX[i];
		}
	}
	code += '];\n';
	// y座標
	code += 'var coordY = [';
	for(var i = 0; i < pointNum; i++) {
		if(i !== pointNum - 1) {
			code += coordY[i] + ',';
		} else {
			code += coordY[i];
		}
	}
	code += '];\n';
	// duration, easing, time..
	code += 'var speed = ' + speed + ';\n';
	code += 'var easing = \'' + easing + '\';\n';
	code += 'var startDate = +new Date();\n';
	code += 'var progress = 0;\n';
	code += 'var target = document.getElementById(\'target\');\n';
	code += 'var t = 0;\n';

	// イージング関数
	code += 'function retEasingVal(x, t, b, c, d, type) {\n';
	var easingEq = retEqStr() + '\n';
	code += '\t' + easingEq;
	code += '}\n';

	// 式の展開関数
	var strBq = '';
	for(var i = 0; i < tmpEq.length; i++) {
		strBq += 'function bq' + i + '() {\n';
		strBq += '\treturn ' + tmpEq[i] + ';\n';
		strBq += '}\n';
	}

	code += strBq;

	//描画
	code += '(function draw() {\n';
	code += '\tvar x = 0;\n';
	code += '\tvar y = 0;\n';
	code += '\tif(progress < 1) {\n';
	code += '\t\twindow.requestAnimationFrame(draw);\n';
	code += '\t}\n';
	/*code += '\n';*/
	code += '\tif(startDate) {\n';
	code += '\t\tprogress = (+new Date() - startDate) / speed;\n';
	code += '\t} else {\n';
	code += '\t\tprogress = 0;\n';
	code += '\t}\n';
	code += '\tif(progress >= 1) {\n';
	code += '\t\tprogress = 1;\n';
	code += '\t}\n';
	code += '\tt = retEasingVal(progress, speed * progress, 0, 1, speed, easing);\n';

	var strX = '';
	var strY = '';
	for(var i = 0; i < pointNum; i++) {
		strX += 'coordX[' + (pointNum-i-1) + '] * bq' + i + '()';
		if(i !== pointNum - 1) {
			strX += ' + ';
		}

		strY += 'coordY[' + (pointNum-i-1) + '] * bq' + i + '()';
		if(i !== pointNum - 1) {
			strY += ' + ';
		}
	}
	code += '\tx = ' + strX + ';\n';
	code += '\ty = ' + strY + ';\n';
	code += '\ttarget.style.left = x + \'px\';\n';
	code += '\ttarget.style.top = y + \'px\';\n';
	code += '})();\n';

	// 出力
	textarea.value = code;
}

// 削除イベント
function onDeleteClick(e) {
	if(e.target.className === 'delete') {
		this.parentNode.removeChild(this);
		propInit();
		canvasInit();
	}
}

// 追加イベント
function onAddClick(e) {
	var parent = document.getElementById('draggables');
	var clone = parent.querySelector('.inputCoord').cloneNode(true);

	parent.appendChild(clone);

	clone.addEventListener('click', onDeleteClick, false);
	clone.addEventListener('keyup', onInputChange, false);

	var inputs = clone.querySelectorAll('input');
	[].forEach.call(inputs, function(input) {
		input.value = canvas.width / 2;
	});

	draggables = document.querySelectorAll('#draggables .draggable');
	clone.addEventListener('dragstart', handleDragStart, false);
	clone.addEventListener('dragenter', handleDragEnter, false);
	clone.addEventListener('dragover', handleDragOver, false);
	clone.addEventListener('dragleave', handleDragLeave, false);
	clone.addEventListener('drop', handleDrop, false);
	clone.addEventListener('dragend', handleDragEnd, false);

	propInit();
	canvasInit();
}

// input変更時のイベント
function onInputChange(e) {
	if(e.target === document.querySelector('#canvasHeight') || e.target === document.querySelector('#canvasWidth')) {
		resetCanvas();
	}
	propInit();
	canvasInit();
}

// select変更時のイベント
function onSelectChange() {
	propInit();
	canvasInit();
}

// canvasのmouseDownイベント
function onCanvasDown(e) {
	targetIndex = -1;
	var canvasWrap = document.querySelector('.canvasWrap');
	mousePos.x = e.pageX - canvasWrap.offsetLeft;
	mousePos.y = e.pageY - canvasWrap.offsetTop;


	for(var i = 0; i < pointNum; i++) {
		var pointX = coordX[i];
		var pointY = coordY[i];
		var offset = 10;
		//console.log(mousePos.x, pointX, mousePos.y, pointY);
		if((mousePos.x >= pointX-offset) && (mousePos.x <= pointX+offset) && (mousePos.y >= pointY-offset) && (mousePos.y <= pointY+offset)) {
			targetIndex = i;
			break;
		}
	}
	if(targetIndex !== -1) {
		flgCanvasDown = true;
	}
}

// canvasのmouseUpイベント
function onCanvasUp(e) {
	flgCanvasDown = false;
}

// canvasのmouseMoveイベント
function onCanvasMove(e) {
	if(flgCanvasDown) {
		var canvasWrap = document.querySelector('.canvasWrap');
		mousePos.x = e.pageX - canvasWrap.offsetLeft;
		mousePos.y = e.pageY - canvasWrap.offsetTop;

		var coords = document.getElementsByClassName('inputCoord');
		var target =coords[targetIndex];
		target.querySelector('.inputX').value = mousePos.x;
		target.querySelector('.inputY').value = mousePos.y;

		propInit();
		canvasInit();
	}
}

// canvasサイズのリセット・コンテキストの再設定・イベントの再登録
function resetCanvas() {
	canvas = document.getElementById('canvas');
	canvasWidth = document.getElementById('canvasWidth').value;
	canvasHeight = document.getElementById('canvasHeight').value;

	canvas.width = canvasWidth || 900;
	canvas.height = canvasHeight || 500;
	context = canvas.getContext('2d');

	canvas.addEventListener('mousedown', onCanvasDown, false);
	canvas.addEventListener('mouseup', onCanvasUp, false);
	canvas.addEventListener('mousemove', onCanvasMove, false);
}

// canvasの描画処理全般
function canvasInit() {
	var t;
	var progress = 0;
	var startDate = +new Date();

	/*
	Based on Robert Penner's original easing equation.
	http://robertpenner.com/easing/

	@param
		x: percent
		t: duration * percent
		b: 0
		c: 1
		d: duration
		type: easing type
	*/
	function retEasingVal(x, t, b, c, d, type) {
		switch(type){
			case 'linear':
				return x;
			case 'easeInQuad':
				return c*(t/=d)*t + b;
			case 'easeOutQuad':
				return -c*(t/=d)*(t-2) + b;
			case 'easeInCubic':
				return c * (t/=d)*t*t + b;
			case 'easeOutCubic':
				return c*((t=t/d-1)*t*t+1) + b;
			case 'easeInBounce':
				return c - retEasingVal(x, d-t, 0, c, d, 'easeOutBounce') + b;
			case 'easeOutBounce':
				if ((t/=d) < (1/2.75)) {
					return c*(7.5625*t*t)+b;
				} else if (t < (2/2.75)) {
					return c*(7.5625*(t-=(1.5/2.75))*t + 0.75) + b;
				} else if (t < (2.5/2.75)) {
					return c*(7.5625*(t-=(2.25/2.75))*t + 0.9375) + b;
				} else {
					return c*(7.5625*(t-=(2.625/2.75))*t + 0.984375) + b;
				}
				break;
			default:
				return x;
		 }
	}

	function drawGrid() {
		var loopW = canvasWidth / 10;
		var loopH = canvasHeight / 10;

		for(var i = 0; i < loopW; i++) {
			context.strokeStyle = '#eee';
			context.beginPath();
			context.moveTo(i * 10, 0);
			context.lineTo(i * 10, canvasHeight);
			context.stroke();
		}
		for(var j = 0; j < loopH; j++) {
			context.strokeStyle = '#eee';
			context.beginPath();
			context.moveTo(0, j * 10);
			context.lineTo(canvasWidth, j * 10);
			context.stroke();
		}
	}

	function drawPoint() {
		context.font = 'normal 14px Arial';

		for(var i = 0; i < pointNum; i++) {
			// ポイント
			context.fillStyle = '#666';
			context.strokeStyle = '#666';
			context.beginPath();
			context.arc(coordX[i], coordY[i], 6, 0, Math.PI*2, false);
			context.stroke();
			if(i === 0 || i === pointNum - 1) {
				context.fill();
			}

			// 直線
			if(i !== pointNum - 1) {
				context.strokeStyle = '#ccc';
				context.beginPath();
				context.moveTo(coordX[i], coordY[i]);
				context.lineTo(coordX[i+1], coordY[i+1]);
				context.stroke();
			}

			// 座標
			context.fillStyle = '#e40056';
			context.fillText('(' + coordX[i] + ',' + coordY[i] + ')', coordX[i]-12, coordY[i]-12);
		}
	}

	(function draw() {
		var x = 0;
		var y = 0;
		var lineX = 0;
		var lineY = 0;

		if(progress < 1) {
			window.requestAnimationFrame(draw, canvas);
		}
		context.clearRect(0, 0, canvas.width, canvas.height);

		if(startDate) {
			progress = (+new Date() - startDate) / speed;
		} else {
			progress = 0;
		}

		if(progress >= 1) {
	    	progress = 1;
		}

		t = retEasingVal(progress, speed * progress, 0, 1, speed, easing);

		setTerms(t);

		for(var i = 0; i < terms.length; i++) {
			x += coordX[terms.length-i-1] * terms[i];
			y += coordY[terms.length-i-1] * terms[i];
		}

		drawGrid();

		// コントロールポイントの描画
		drawPoint();

		context.strokeStyle = '#666';
		context.beginPath();

		// 4次以上だと関数がないため、moveTo, lineToで
		for(var i = 0; i <= 1; i+=0.01) {
			setTerms(i);

			lineX = 0;
			lineY = 0;

			for(var j = 0; j < terms.length; j++) {
				lineX += coordX[terms.length-j-1] * terms[j];
				lineY += coordY[terms.length-j-1] * terms[j];
			}

			if(i === 0) {
				context.moveTo(lineX, lineY);
			} else {
				context.lineTo(lineX ,lineY);
			}
		}
		context.lineTo(coordX[pointNum-1], coordY[pointNum-1]);
		context.stroke();

		// ボールの描画
		context.save();
		context.fillStyle = "#cc0000";
		if(flgCanvasDown) {
			context.globalAlpha = 0;
		} else {
			context.globalAlpha = 0.6;
		}
		context.beginPath();
		context.arc(x, y, 10, 0, Math.PI*2, false);
		context.closePath();
		context.fill();
		context.restore();
	})();
}

/* 座標入力欄のドラッグ&ドロップ処理 */
function handleDragStart(e) {
	this.style.opacity = '0.4';
	dragSrcEl = this;
	e.dataTransfer.effectAllowed = 'move';
 	e.dataTransfer.setData('text/html', this.innerHTML);
}
function handleDragOver(e) {
	if (e.preventDefault) {
		e.preventDefault();
	}
	e.dataTransfer.dropEffect = 'move';
	return false;
}
function handleDragEnter(e) {
	this.classList.add('over');
}
function handleDragLeave(e) {
	this.classList.remove('over');
}
function handleDrop(e) {
	if (e.stopPropagation) {
		e.stopPropagation();
	}
	if (dragSrcEl != this) {
		dragSrcEl.innerHTML = this.innerHTML;
		this.innerHTML = e.dataTransfer.getData('text/html');
	}
	return false;
}
function handleDragEnd(e) {
	[].forEach.call(draggables, function (draggable) {
		draggable.style.opacity = 1;
		draggable.classList.remove('over');
		propInit();
		canvasInit();
	});
}
function dragInit() {
	draggables = document.querySelectorAll('#draggables .draggable');
	[].forEach.call(draggables, function(draggable) {
		draggable.addEventListener('dragstart', handleDragStart, false);
		draggable.addEventListener('dragenter', handleDragEnter, false);
		draggable.addEventListener('dragover', handleDragOver, false);
		draggable.addEventListener('dragleave', handleDragLeave, false);
		draggable.addEventListener('drop', handleDrop, false);
		draggable.addEventListener('dragend', handleDragEnd, false);
	});
}

// クエリつきのURLを生成
function outputUrl() {
	var trigger = document.getElementById('urlBtn');
	var field = document.getElementById('url');
	var base = location.href.split('?')[0];

	trigger.addEventListener('click', function() {
		var shareURL = '';
		field.value = '';
		var coordsArr = [];
		var inputs = document.getElementsByClassName('inputCoord');
		[].forEach.call(inputs, function(input) {
			var x = input.querySelector('.inputX').value || 0;
			var y = input.querySelector('.inputY').value || 0;
			coordsArr.push(x);
			coordsArr.push(y);
		});
		var coords = coordsArr.join(',');
		shareURL += base;
		shareURL += '?e=';
		shareURL += easing || 'linear';
		shareURL += '&s=';
		shareURL += speed || 1000;
		shareURL += '&w=';
		shareURL += canvasWidth || 500;
		shareURL += '&h=';
		shareURL += canvasHeight || 500;
		shareURL += '&c=';
		shareURL += coords;
		setTimeout(function() {
			field.value = shareURL;
		}, 50);
	});
}

// URLからクエリを取得、クエリが存在すれば初期設定
function setQuery() {
	var url = location.href;
	var queryStr = url.split('?')[1];
	if(!queryStr) {
		return false;
	}
	var queryArr = queryStr.split('&');
	var easing = queryArr[0].split('=')[1];
	var speed = queryArr[1].split('=')[1];
	var canvasW = queryArr[2].split('=')[1];
	var canvasH = queryArr[3].split('=')[1];
	var coords = queryArr[4].split('=')[1].split(',');
	var count = coords.length / 2;
	var inputs = '';

	document.getElementById('easingSelect').value = easing;
	document.getElementById('speed').value = speed;
	document.getElementById('canvasWidth').value = canvasW;
	document.getElementById('canvasHeight').value = canvasH;
	
	for(var i = 0; i < count; i++) {
		inputs += '<div class="inputItem inputCoord draggable">';
		inputs += '<span>';
		inputs += i;
		inputs += '</span>';
		inputs += '<label>X</label><input class="inputX" type="text" value="';
		inputs += coords[i * 2];
		inputs += '">';
		inputs += '<label>Y</label><input class="inputY" type="text" value="';
		inputs += coords[i * 2 + 1];
		inputs += '">';
		inputs += '<div class="delete"></div>';
		inputs += '</div>';
	}
	document.getElementById('draggables').innerHTML = inputs;
}

// ヘルプ
var help = {
	conf: {
		overlayMask: {}
	},
	init: function() {
		var self = this;
		var conf = self.conf;
		var trigger = document.querySelector('.help');
		conf.overlayMask = document.getElementById('overlayMask');
		trigger.addEventListener('click', function() {
			self.setOverlay();
		});
		conf.overlayMask.addEventListener('click', function() {
			self.hideOverlay();
		});
		function goNext(remove, add, scroll, offset) {
			document.querySelector(remove).classList.remove('is-show');
			document.querySelector(add).classList.add('is-show');
			document.body.scrollTop = document.querySelector(scroll).offsetTop + (offset || 0);
		}
		document.querySelector('.guide01 .next').addEventListener('click', function() {
			goNext('.guide01', '.guide02', '#inputArea');
		});
		document.querySelector('.guide02 .next').addEventListener('click', function() {
			goNext('.guide02', '.guide03', '#url', -100);
		});
		document.querySelector('.guide03 .next').addEventListener('click', function() {
			goNext('.guide03', '.guide04', '#outputBtn');
		});
		document.querySelector('.guide04 .closeOverlay').addEventListener('click', function() {
			self.hideOverlay();
		});
	},
	setOverlay: function() {
		var self = this;
		var conf = self.conf;
		var winWidth = window.getComputedStyle(document.querySelector('.container')).width;
		var winHeight = window.getComputedStyle(document.querySelector('.container')).height;
		conf.overlayMask.style.width = winWidth;
		conf.overlayMask.style.height = winHeight;
		conf.overlayMask.classList.add('is-show');
		document.querySelector('.guide01').classList.add('is-show');
		var guide01X = document.querySelector('.canvasWrap').offsetLeft;
		var guide01Y = document.querySelector('.canvasWrap').offsetTop;
		document.querySelector('.guide01').style.left = guide01X + 40 + 'px';
		document.querySelector('.guide01').style.top = guide01Y + 200 + 'px';
		var guide02X = document.querySelector('#inputArea').offsetLeft;
		var guide02Y = document.querySelector('#inputArea').offsetTop;
		document.querySelector('.guide02').style.left = guide02X + 20 + 'px';
		document.querySelector('.guide02').style.top = guide02Y + 100 + 'px';
		var guide03X = document.querySelector('#url').offsetLeft;
		var guide03Y = document.querySelector('#url').offsetTop;
		document.querySelector('.guide03').style.left = guide03X + 180 + 'px';
		document.querySelector('.guide03').style.top = guide03Y - 60 + 'px';
		var guide04X = document.querySelector('#outputBtn').offsetLeft;
		var guide04Y = document.querySelector('#outputBtn').offsetTop;
		document.querySelector('.guide04').style.left = guide04X + 40 + 'px';
		document.querySelector('.guide04').style.top = guide04Y + 50 + 'px';
	},
	hideOverlay: function() {
		var self = this;
		var conf = self.conf;
		var guides = document.getElementsByClassName('overlayContent');
		conf.overlayMask.classList.remove('is-show');
		[].forEach.call(guides, function(guide) {
			guide.classList.remove('is-show');
		});
	}
};

// 初期化
setQuery();
dragInit();
resetCanvas();
propInit();
replayInit();
inputInit();
deleteInit();
addInit();
outputInit();
tabInit();
outputUrl();

help.init();

// 読み込み後即時に実行するとアニメーションの開始が飛んで見えるので、実行タイミングをずらす
setTimeout(function() {
	canvasInit();
}, 100);
