local skynet = require "skynet"
local socket = require "skynet.socket"
local httpd = require "http.httpd"
local sockethelper = require "http.sockethelper"
local urllib = require "http.url"
local websocket = require "websocket.websocket"
local table = table
local string = string
local mode = ...

if mode == "agent" then

	local wsPool = {}

local function response(id, ...)
	local ok, err = httpd.write_response(sockethelper.writefunc(id), ...)
	if not ok then
		-- if err == sockethelper.socket_error , that means socket closed.
		skynet.error(string.format("fd = %d, %s", id, err))
	end
end

local handler = {}
function handler.onMessage(fd, msg )
	print(string.format("%d has msg %s", fd,msg))
	local  ws = wsPool[fd]
	if ws then
		print('send ms')
		ws:send('i am a sever')
	end
end

function handler.onError(fd, err )
	print('has err'..err)
end

function handler.onClose( fd )
	print('client close')
end

skynet.start(function()
	skynet.dispatch("lua", function (_,_,id)
		socket.start(id)
		-- limit request body size to 8192 (you can pass nil to unlimit)
		local code, url, method, header, body = httpd.read_request(sockethelper.readfunc(id), 8192)
		if code then
			--Upgrade

			local isok,msg,ws = websocket.accept(id, header)
			if isok then
				wsPool[id] = ws
				socket.write(id,msg)
				ws:start(sockethelper.readfunc(id), sockethelper.writefunc(id), handler)
			else
				response(id,code)
				socket.close(id)
			end
		else
			if url == sockethelper.socket_error then
				skynet.error("socket closed")
			else
				skynet.error(url)
			end

			socket.close(id)
		end
	end)
end)

else

skynet.start(function()
	local agent = {}
	for i= 1, 1 do
		agent[i] = skynet.newservice(SERVICE_NAME, "agent")
	end
	local balance = 1
	local id = socket.listen("0.0.0.0", 8001)
	skynet.error("Listen web port 8001")
	socket.start(id , function(id, addr)
		skynet.error(string.format("%s connected, pass it to agent :%08x", addr, agent[balance]))
		skynet.send(agent[balance], "lua", id)
		balance = balance + 1
		if balance > #agent then
			balance = 1
		end
	end)
end)

end