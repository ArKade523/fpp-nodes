import Rete from "rete";

export const universalSocket = new Rete.Socket('Universal');
export const numSocket = new Rete.Socket('Number');

numSocket.combineWith(universalSocket);
universalSocket.combineWith(numSocket);
universalSocket.compatibleWith = s => {
    return true;
}