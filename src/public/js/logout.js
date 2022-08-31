function getUserName() {
  const name = document.getElementById("name-title");
  if (!name.textContent) {
    fetch("/current", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((res) => (name.textContent = "Bienvenido " + res.first_name));
  }
}

getUserName();

const logout = document.getElementById("logoutButton");

logout.addEventListener("click", (evt) => {
  fetch("/logout", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }).then(() => window.location.replace("/login"));
});
