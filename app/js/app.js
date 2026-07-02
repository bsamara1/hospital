console.log("Sistema Hospital Agostinho Neto iniciado.");

const utilizador = JSON.parse(localStorage.getItem("utilizador"));

if (!utilizador) {
    window.location.href = "login.html";
}

function logout(){

localStorage.removeItem("utilizador");

window.location.href="login.html";

}
function notificar(msg){
alert("🔔 " + msg);
}