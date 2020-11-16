function handlePlaylistTrackActivate(event) {
  event.preventDefault();

  if (event.target.classList.contains('active')) {
    return false;
  }

  document.querySelector('.demo-playlist .track.active')?.classList.remove('active');
  event.target.classList.add('active');
  document.querySelector('video source').src = event.target.href;
  const videoElement = document.querySelector('video');
  if (!videoElement.paused) {
    videoElement.pause();
  }
  videoElement.load();
  videoElement.currentTime = 0;

  return false;
}

function handlePlaylistTrackHover(event) {
  const timer = setTimeout(() => {
    handlePlaylistTrackActivate(event);
  }, 500);

  function onLeave() {
    clearTimeout(timer);
    event.target.removeEventListener('mouseleave', onLeave);
  }

  event.target.addEventListener('mouseleave', onLeave);
}

function handleChildcareInterest(event) {
  const emailInput = document.querySelector('input[name="email"]');
  Intercom('boot', { email: emailInput.value, });
  Intercom('trackEvent', 'childcare-interest');

  const success = document.createElement('div');
  success.className = 'success';
  success.innerHTML = `<p><strong>Great!</strong> We'll be in touch over email.</p>`;

  const interestPanel = document.querySelector('.interest-panel');
  interestPanel.insertBefore(success, interestPanel.firstChild);

  event.preventDefault();
  return false;
}

for (const item of document.querySelectorAll('.demo-playlist .track')) {
  item.addEventListener('mouseenter', handlePlaylistTrackHover);
  item.addEventListener('click', handlePlaylistTrackActivate);
}

document.querySelector('#interest-form').addEventListener('submit', handleChildcareInterest);
