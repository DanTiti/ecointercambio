document.addEventListener("DOMContentLoaded", function() {
    const menuBtn = document.getElementById("menuBtn");
    const dropdown = document.getElementById("myDropdown");

    if (menuBtn && dropdown) {
        menuBtn.onclick = (e) => { 
            e.stopPropagation(); 
            dropdown.classList.toggle("show"); 
        };

        window.onclick = () => { 
            if(dropdown.classList.contains('show')) {
                dropdown.classList.remove('show'); 
            }
        };
    }
});