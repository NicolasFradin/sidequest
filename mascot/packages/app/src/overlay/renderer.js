const mascotImages = {
  "ronnie-coleman": "../../assets/mascots/ronnie-coleman.png",
  "miami-80s": "../../assets/mascots/miami-80s.png",
};

const mascotImg = document.getElementById("mascot-img");
const exerciseLabel = document.getElementById("exercise-label");
const exerciseDuration = document.getElementById("exercise-duration");
const btnDone = document.getElementById("btn-done");
const btnSkip = document.getElementById("btn-skip");
const btnSettings = document.getElementById("btn-settings");

window.mascotAPI.onShowExercise(({ exercise, mascot, theme }) => {
  mascotImg.src = mascotImages[mascot] ?? mascotImages["ronnie-coleman"];
  exerciseLabel.textContent = exercise.label;
  exerciseDuration.textContent = `${exercise.durationSec} secondes`;
  document.documentElement.dataset.theme = theme ?? "dark";
});

window.mascotAPI.onThemeChanged((theme) => {
  document.documentElement.dataset.theme = theme;
});

btnDone.addEventListener("click", () => window.mascotAPI.markDone());
btnSkip.addEventListener("click", () => window.mascotAPI.markSkipped());
btnSettings.addEventListener("click", () => window.mascotAPI.openDashboard());
