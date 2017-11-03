--用来监听外部的联机，并读取数据.但是它并不负责数据业务层的处理，而是将
--数据交给gateHandler来处理，这样就可以复用此server啦.
local skynet = require "skynet"
local socketdriver = require "skynet.socket"
local httpd = require "http.httpd"
local sockethelper = require "http.sockethelper"
local urllib = require "http.url"
local websocket = require "websocket.websocket"
local table = table
local string = string
local mode = ...

local websocketGateServer = {}
local socket	-- listen socket
local CMD = {}
local wsPool = {}

local netPack = {}
local handerMsg
local msgPool = {}--用于存储未接受完的msg.

function netPack.onMessage(fd, msg)
	--需要进行拆包处理，拆完包后交由handler处理.
	--暂时认为是一个完整的包.
	--local  dataSz = msg:byte(1) * 256 + msg:byte(2)

	local unpackMsg = msg--msg:sub(3,dataSz+2)
	handerMsg.message(fd,unpackMsg)
end
function netPack.onError(fd, err)
	-- body
end
function netPack.onClose(fd)
	-- body
end

function websocketGateServer.openclient( fd )
	
end

function websocketGateServer.closeclient( fd )
	
end

function websocketGateServer.send(fd, msg)
	local  ws = wsPool[fd]
	if ws then
		ws:send(msg)
	end
end

function websocketGateServer.start( handler )
	assert(handler.message)
	assert(handler.connect)
	handerMsg = handler
	local function response(id, ...)
		local ok, err = httpd.write_response(sockethelper.writefunc(id), ...)
		if not ok then
			-- if err == sockethelper.socket_error , that means socket closed.
			skynet.error(string.format("fd = %d, %s", id, err))
		end
	end

	local function OnConnect( id,address)
		socketdriver.start(id)
		local code, url, method, header, body = httpd.read_request(sockethelper.readfunc(id), 8192)
		if code then
			--Upgrade

			local isok,msg,ws = websocket.accept(id, header)
			if isok then
				wsPool[id] = ws
				handler.connect(id,address)
				socketdriver.write(id,msg)
				ws:start(sockethelper.readfunc(id), sockethelper.writefunc(id), netPack)
			else
				response(id,code)
				socketdriver.close(id)
			end
		else
			if url == sockethelper.socket_error then
				skynet.error("socket closed")
			else
				skynet.error(url)
			end

			socketdriver.close(id)
		end
	end

	function CMD.open( source, conf )
		assert(not socket)
		local address = conf.address or "0.0.0.0"
		local port = assert(conf.port)
		maxclient = conf.maxclient or 1024

		skynet.error(string.format("Listen on %s:%d", address, port))
		socket = socketdriver.listen(address, port)
		socketdriver.start(socket,OnConnect)
		if handler.open then
			return handler.open(source, conf)
		end
	end

	function CMD.close()
		assert(socket)
		socketdriver.close(socket)
	end

	function CMD.send(source, fd, msg)
		local  ws = wsPool[fd]
		if ws then
			ws:send(msg,websocket.opcode.binary)
		end
	end

	skynet.start(function()
		skynet.dispatch("lua",function(_, address, cmd, ...)
			local f = CMD[cmd]
			if f then
				skynet.ret(skynet.pack(f(address, ...)))
			else
				skynet.ret(skynet.pack(handler.command(cmd, address, ...)))
			end
		end)
	end)

end

return websocketGateServer