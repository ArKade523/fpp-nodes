import Rete from "rete";

export const universalSocket = new Rete.Socket('Universal');
export const numSocket = new Rete.Socket('Number');
export const stringSocket = new Rete.Socket('String');
export const componentSocket = new Rete.Socket('Component');

const sockets = [universalSocket, numSocket, stringSocket, componentSocket];

for (const socket of sockets) {
    socket.combineWith(universalSocket);
    universalSocket.combineWith(socket);
}
universalSocket.compatibleWith = s => {
    return true;
}