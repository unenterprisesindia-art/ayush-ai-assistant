async function sendMessage() {
  const input = document.getElementById("userInput").value;
  const chatBox = document.getElementById("chatBox");

  chatBox.innerHTML += `<p><b>You:</b> ${input}</p>`;

  const response = await fetch("/chatWithWatson", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: input })
  });

  const data = await response.json();

  chatBox.innerHTML += `<p><b>AYUSH AI:</b> ${data.reply}</p>`;
}
