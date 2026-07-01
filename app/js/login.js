const utilizadores=[

{

username:"admin",

password:"1234",

nome:"Administrador"

},

{

username:"rececao",

password:"hospital",

nome:"Receção"

}

];

document
.getElementById("loginForm")
.addEventListener("submit",function(e){

e.preventDefault();

const user=
document.getElementById("utilizador").value;

const pass=
document.getElementById("senha").value;

const encontrado=
utilizadores.find(u=>

u.username===user &&

u.password===pass

);

if(encontrado){

localStorage.setItem(

"utilizador",

JSON.stringify(encontrado)

);

window.location.href="index.html";

}else{

document.getElementById("mensagem").innerHTML=

"Utilizador ou senha incorretos.";

}

});