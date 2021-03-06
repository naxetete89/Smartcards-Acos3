
card = new Card();
atr = card.reset(Card.RESET_COLD);
print("");

//constantes crifrado
var crypto = new Crypto();
var deskey = new Key();
//constantes TLVs
var CLArecord = "8C D2 00 08";


print("Constante Kt");
var Kt = new ByteString("AA 00 AA 01 AA 02 AA 03", HEX);

print("Constante Kc");
var Kc = new ByteString("DD 00 DD 01 DD 02 DD 03", HEX);

var aleatorioC = card.plainApdu(new ByteString("80 84 00 00 08", HEX));

deskey.setComponent(Key.DES, Kt);
var cifrado =  crypto.encrypt(deskey, Crypto.DES_ECB, aleatorioC);
var aleatorioT = crypto.generateRandom(8);
var encriptado = cifrado.concat(aleatorioT);
print("");

//autenticar
resp = card.plainApdu(new ByteString("80 82 00 00 10", HEX).concat(encriptado));
print("Código SW: " + card.SW.toString(16));
print("");
resp = card.plainApdu(new ByteString("80 C0 00 00 08", HEX));
print ("Respuesta a la autenticación " + resp);

deskey.setComponent(Key.DES, Kc);
var encriptadoKS = crypto.encrypt(deskey, Crypto.DES_ECB, aleatorioC);
var paso1  = encriptadoKS.xor(aleatorioT);
deskey.setComponent(Key.DES, Kt);
// PASO 1
Ks = crypto.encrypt(deskey, Crypto.DES_ECB, paso1);
print("paso");
deskey.setComponent(Key.DES, Ks);
var checkeo = crypto.encrypt(deskey, Crypto.DES_ECB, aleatorioT);
print("Comprobando autenticador");
print(" variable de checkeo: "+checkeo.toString());
print("Comprobando respuesta");
print(" respuesta: "+resp.toString());

//PASO 2
var msgEnviar = new ByteString("00 01 02 03",HEX);
var msgRelleno = msgEnviar.pad(Crypto.ISO9797_METHOD_2, true);
print("paso 1");
//PASO 4
var vectorI = aleatorioC.and(new ByteString("00 00 00 00 00 00 FF FF",HEX));
print("paso 2");
//PASO 5
var msgEncriptado = crypto.encrypt(deskey, Crypto.DES_CBC, msgRelleno, vectorI);
print("paso 3");

//TLV87

var H87 = "87";
var L87 = "0" + (msgEncriptado.length+1).toString(16);
var Pi = "0" + (msgRelleno.length - 4).toString(16);

var TLV87 = new ByteString("87"+L87+Pi+msgEncriptado,HEX);
//lanzar inquire
var vectorIMac = aleatorioC.and(new ByteString("00 00 00 00 00 00 FF FF",HEX)).add(1);
var inqTLV = new ByteString("89 04 8C E4 02 00",HEX);
var MacClaro = inqTLV.concat(TLV87);
var MacRelleno = MacClaro.pad(Crypto.ISO9797_METHOD_2, true);
var MacCifrado = crypto.encrypt(deskey, Crypto.DES_CBC,MacRelleno, vectorIMac);
print("paso 4");
var todoCifrado = MacCifrado.right(8);
var Mac4 = todoCifrado.left(4);

//enviar
var resp = card.plainApdu(new ByteString("8C E4 02 00" + (9 + msgEncriptado.length).toString(16),HEX).concat(TLV87).concat(new ByteString("8E 04", HEX)).concat(Mac4));
print("Código SW: " + card.SW.toString(16));

//Get Response
print("");
autenticacion = card.plainApdu(new ByteString("80 C0 00 00 17", HEX));
print ("Respuesta a la autenticación " + resp);
print("Código SW: " + card.SW.toString(16));
//verificar MAC
//verificar MAC
var respuestaConc = inqTLV.concat(autenticacion.left(autenticacion.length - 6));
var MacComprobarRelleno = respuestaConc.pad(Crypto.ISO9797_METHOD_2, true);
var vectorIMac2 = aleatorioC.and(new ByteString("00 00 00 00 00 00 FF FF",HEX)).add(2);
var MacComprobarCifrado = crypto.encrypt(deskey, Crypto.DES_CBC,MacComprobarRelleno, vectorIMac2);
var todoCifrado = MacComprobarCifrado.right(8);
var Mac4 = todoCifrado.left(4);


print("Comprobar coincidencia MAC: "+autenticacion.right(4)+"+<------>"+Mac4);

if(autenticacion != ""){
	print("la tarjeta se ha autenticado correctamente: "+autenticacion);
	//Lanzar inquire con los datos obtenidos
	var resulL  = autenticacion.bytes(1,1).toSigned()-1;
    var resulPi = autenticacion.bytes(2,1);
    
    //desciframos el resultado de la autenticación
    var resulDescifrado = crypto.decrypt(deskey, Crypto.DES_CBC, autenticacion.bytes(3,resulL), vectorIMac2);
    
   
    balance = resulDescifrado.bytes(0,resulL - resulPi.toSigned());
    balance = balance.bytes(4);
    print("Balance actual: "+balance.bytes(1,3).toSigned());
	
}