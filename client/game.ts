import { io } from 'socket.io-client'

const socket = io()

socket.emit('game:ping', 'Hello world!')
