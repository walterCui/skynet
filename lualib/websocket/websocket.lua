local  skynet = require "skynet"
local crypt = require "client.crypt"
local base64 = crypt.base64encode
local sha1 = crypt.sha1

local websocket_protocol = 'sec-websocket-protocol'
local websocket_key = 'sec-websocket-key'
local websocket_upgrade = 'upgrade'
local websocket_key_magic = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

local websocket = {
opcode={continuation=0x0, text = 0x1, binary = 0x2, close = 0x8, ping = 0x9, pong = 0xA}
}
local websocket_mt = {__index=websocket}

function websocket.unMask( maskkey, data, len)
	local ret = {}
	for i = 1, len do 
		ret[i] = string.char(string.byte(data,i) ~ string.byte(maskkey, (i - 1) % 4 + 1))
	end
	return table.concat(ret)
end

function websocket.accept(id, header )
	if header == nil then
		return false
	end

	local  upgrade = header[websocket_upgrade]
	if upgrade ~= nil and upgrade == 'websocket' then
		local socketKey = header[websocket_key]
		socketKey = socketKey .. websocket_key_magic
		socketKey = sha1(socketKey)
		socketKey = base64(socketKey)

		local protocol = header[websocket_protocol]  or ""

		local ret = string.format("HTTP/1.1 101 Switching Protocols\r\n" ..
                "Upgrade: websocket\r\n" ..
                "Connection: Upgrade\r\n" ..
                "Sec-WebSocket-Accept: %s\r\n" ..
                "%s\r\n", socketKey, protocol)


		local self = {socketFd=id}
		self = setmetatable(self,websocket_mt)
		return true, ret, self
	else 
		return false
	end
end

function websocket:close()
	self.connect = false
	self.hander.onClose(self.socketFd)
end

function websocket:send(msg, opcode)
	writeFunc = self.writeFunc 

	if writeFunc == nil or msg == nil then
		return
	end
	
	if opcode == nil then
		opcode = websocket.opcode.text
	end

	local header = 0x80 | opcode

	local data = {}
	local len = 1

	data[len]= string.pack("B",header)
	len = len + 1

	local mask_bit = 0
	local  msgLen = #msg

	local payloadLen
	if msgLen < 126 then
		payloadLen = string.pack("B",msgLen | mask_bit)
	elseif msgLen < 0xFF then
		payloadLen = string.pack(">BH",126 | mask_bit, msgLen)
	else
		payloadLen = string.pack(">BL",127 | mask_bit, msgLen)
	end

	data[len]= payloadLen
	len = len + 1

	data[len]= msg
	len = len + 1

	writeFunc(table.concat(data))
end

function websocket:readFrame( readFunc )
	if readFunc == nil then
		return true, ''
	end
	local data = readFunc(2)
	if not data then
		return true, 'no data'
	end

	local header,payloadLen = string.unpack('BB',data)

	local fin = header & 0x80 ~= 0
	local rsv = header & 0x70
	local opcode = header & 0xf

	if rsv ~= 0 then
		return true, 'the rsv must 0'
	end

	local mask = payloadLen & 0x80 ~= 0
	if not mask then
		return true, 'must has mask'
	end

	payloadLen = payloadLen & 0x7f
	local dataLen = 0
	if payloadLen < 126 then
		dataLen = payloadLen
	elseif payloadLen == 126 then
		data = readFunc(2)
		if not data then
			return true, 'no data'
		end
		dataLen = string.unpack('>H',data)
	elseif payloadLen == 127 then
		data = readFunc(8)
		if not data then
			return true, 'no data'
		end
		dataLen = string.unpack('>L',data)
	end

	
	data = readFunc(4)
	if not data then
		return true, 'no data' 
	end
	local maskkey = data

	data = readFunc(dataLen)
	if not data then
		return true, 'no data' 
	end
	data = websocket.unMask(maskkey, data, dataLen)

	if not fin then
		return false, false, data
	else
		local enuCode = websocket.opcode
		if opcode == enuCode.continuation or opcode == enuCode.text  or opcode == enuCode.binary then
			return false, true, data
		elseif opcode == enuCode.close then
			--close.
			print('by close'..data)
			self:close()
		elseif opcode == enuCode.ping then
			--ping
		elseif opcode == enuCode.pong then
			--pong
		end
		return false, true, nil
	end

end

--bool,bytes readFunc(sz)
--hander = {onMessage=func}
function websocket:start(readFunc, writeFunc, hander)
	if readFunc == nil or hander == nil then
		return
	end

    self.writeFunc=writeFunc
    self.connect = true
    self.hander=hander

	local tempTable = {}
	while(self.connect) do
		local err, isOver, data = self:readFrame(readFunc)

		if self.connect == false then
			break;
		end

		if err then
			hander.onError(self.socketFd,isOver)
			break;
		end
		table.insert(tempTable,data)
		if isOver then
			local msg = table.concat(tempTable)
			hander.onMessage(self.socketFd,msg)
			tempTable = {}
		end
	end

end

return websocket