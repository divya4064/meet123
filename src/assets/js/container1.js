document.addEventListener('DOMContentLoaded', function() {
    const openLinkButton = document.getElementById('openLinkButtonFile');
    const overlay = document.getElementById('overlayFile');
    const modal = document.getElementById('modalFile');
    const embeddedFrame = document.getElementById('inlineFrameExampleFile');
    const closeLinkButton = document.getElementById('closeLinkButtonFile');
  
    
    
  
    openLinkButton.addEventListener('click', function() {
      modal.classList.remove('hidden');
      overlay.classList.remove('hidden');
      
  
      // Set the size of the modal and iframe
      modal.style.width = window.innerWidth + 'px';
      modal.style.height = window.innerHeight + 'px';
      embeddedFrame.style.width = '100%';
      embeddedFrame.style.height = '100%';
      
     
    });
  
    closeLinkButton.addEventListener('click', function() {
      modal.classList.add('hidden');
      overlay.classList.add('hidden');
      embeddedFrame.src = 'about:blank';
    });
  });