const express = require('express'),
	session = require('cookie-session'),
	bodyParser = require('body-parser'),
	urlencodedParser = bodyParser.urlencoded({
		extended: false
	}),

	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	ent = require('ent'),
	fs = require('fs');

var	jsonTodo = null,
	jsonTobuy = null,
	todoList = null,
	tobuyList = null;

app.ioTodo = io.of('/todo');

io.of('/chat').on("connection", function (socket) {
	socket.on('pseudo', function (clientName) {
		io.of('/chat').emit('org msg', clientName + " connected");
	});
	socket.on('sender name', function (senderName) {
		io.of('/chat').emit('sender name', senderName);
	});
	socket.on('chat message', function (msg) {
		io.of('/chat').emit('chat message', msg);
	});
});

function getFile(path) {
	var fileContents;
	try {
		fileContents = fs.readFileSync(path, 'utf-8');
	} catch (err) {
		throw err;
	}
	return fileContents;
}

io.of('/todo').on("connection", function (socket) {
	todoList = getFile('todo.json')

	if (todoList != null && todoList != '') {
		jsonTodo = JSON.parse(todoList);
		jsonTodo.forEach(function (item) {
			io.of('/todo').to(socket.id).emit('addOneTodo', item);
		});
	}

	socket.on('addTodo', function (item) {
		todoList = fs.readFileSync('todo.json', 'utf-8');
		if (todoList != null) {
			jsonTodo = JSON.parse(todoList);
			jsonTodo.push(item);
			todoList = JSON.stringify(jsonTodo);
			fs.writeFile('todo.json', todoList, 'utf8', function (err) {
				if (err) throw err;
			});
			io.of('/todo').emit('addOneTodo', item);
		}
	});

	socket.on('changedTodo', function () {
		io.of('/todo').emit('changedTodo');
	});

	//__---___---___---___---___---___---___---___

	tobuyList = getFile('tobuy.json');

	if (tobuyList != null && tobuyList != '') {
		jsonTobuy = JSON.parse(tobuyList);
		jsonTobuy.forEach(function (item) {
			io.of('/todo').to(socket.id).emit('addOneTobuy', item);
		});
	}

	socket.on('addTobuy', function (item) {
		tobuyList = fs.readFileSync('tobuy.json', 'utf-8');
		if (tobuyList != null) {
			jsonTobuy = JSON.parse(tobuyList);
			jsonTobuy.push(item);
			tobuyList = JSON.stringify(jsonTobuy);
			fs.writeFile('tobuy.json', tobuyList, 'utf8', function (err) {
				if (err) throw err;
			});
			io.of('/todo').emit('addOneTobuy', item);
		}
	});

	socket.on('changedTobuy', function () {
		io.of('/todo').emit('changedTobuy');
	});

});

app.use(session({
		secret: 'topsecret'
	}))
	.use(express.static(__dirname + '/chat'))
	.use(express.static(__dirname + '/todoList'))
	.use(express.static(__dirname + '/streaming'))
	.use(express.static(__dirname + '/weather'))

	/*affiche l'accueil*/
	.get('/', function (req, res) {
		res.sendFile(__dirname + '/index.html');
	})

	/*affiche le chat*/
	.get('/chat', function (req, res) {
		res.sendFile(__dirname + '/chat/chat.html');
	})

	/*affiche MusicSheetMaker*/
	.get('/MSM', function (req, res) {
		res.sendFile(__dirname + '/MusicSheetMaker/MSM.html');
	})

	/*affiche MusicSheetMaker*/
	.get('/logo', function (req, res) {
		res.sendFile(__dirname + '/MusicSheetMaker/logo.jpg');
	})

	/*affiche MusicSheetMaker*/
	.get('/pdf', function (req, res) {
		res.sendFile(__dirname + '/MusicSheetMaker/music-sheet-maker.pdf');
	})

	/* affiche la todolist */
	.get('/todo', function (req, res) {
		res.sendFile(__dirname + '/todoList/todo.html');
	})

	.get('/todo/suppr/:id', function (req, res) {
		if (req.params.id != "") {
			jsonTodo = fs.readFileSync('todo.json', 'utf-8');
			if (jsonTodo != null) {
				var arrayTodo = JSON.parse(jsonTodo);
				arrayTodo.splice(req.params.id, 1);
				jsonTodo = JSON.stringify(arrayTodo);
				fs.writeFile('todo.json', jsonTodo, 'utf8', function (err) {
					if (err) throw err;
				});
			}
		}
		req.app.ioTodo.emit('changeTodo', req.params.id);
		res.redirect("/todo");
	})

	.get('/todo/supprTobuy/:id', function (req, res) {
		if (req.params.id != "") {
			jsonTobuy = fs.readFileSync('tobuy.json', 'utf-8');
			if (jsonTobuy != null) {
				var arrayTobuy = JSON.parse(jsonTobuy);
				arrayTobuy.splice(req.params.id, 1);
				jsonTobuy = JSON.stringify(arrayTobuy);
				fs.writeFile('tobuy.json', jsonTobuy, 'utf8', function (err) {
					if (err) throw err;
				});
			}
		}
		req.app.ioTodo.emit('changeTobuy', req.params.id);
		res.redirect("/todo");
	})

	//_________-----------____START-STREAMING_______-------_____

	.get('/streaming', function (req, res) {
		res.sendFile(__dirname + '/streaming/streaming.html');
	})

	.get('/video', function (req, res) {
		var path = __dirname + '/streaming/assets/Rick.mkv',
			stat = fs.statSync(path),
			fileSize = stat.size,
			range = req.headers.range;

		if (range) {
			var parts = range.replace(/bytes=/, "").split("-"),
				start = parseInt(parts[0], 10),
				end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1,

				chunksize = (end - start) + 1,
				file = fs.createReadStream(path, {
					start,
					end
				}),
				head = {
					'Content-Range': `bytes ${start}-${end}/${fileSize}`,
					'Accept-Ranges': 'bytes',
					'Content-Length': chunksize,
					'Content-Type': 'video/mkv',
				};

			res.writeHead(206, head);
			file.pipe(res);
		} else {
			const head = {
				'Content-Length': fileSize,
				'Content-Type': 'video/mkv',
			}
			res.writeHead(200, head)
			fs.createReadStream(path).pipe(res)
		}
	})
	//_________-----------____END-STREAMING_______-------_____

	.get('/weather', function (req, res) {
		res.sendFile(__dirname + '/weather/weather.html');
	})

	/* redirige vers l'accueil si la page demandée n'est pas trouvée */
	.use(function (req, res) {
		res.redirect('/');
	});

server.listen(8080);
