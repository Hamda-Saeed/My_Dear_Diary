// Redirect if no token found
const token = localStorage.getItem('token');
if (!token) {
  window.location.href = 'login.html';
}

// Logout function
function logout() {
  localStorage.removeItem("token");
  window.location.href = "login.html";
}

// Toggle Sidebar
function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const main = document.querySelector(".main-content");
  const hamburger = document.querySelector(".hamburger");

  sidebar.classList.toggle("collapsed");
  main.classList.toggle("expanded");
  hamburger.classList.toggle("collapsed");
}

// Toggle Dropdown for Tasks
function toggleDropdown() {
  const menu = document.getElementById("dropdownMenu");
  const arrow = document.getElementById("arrow");

  menu.classList.toggle("open");
  arrow.innerHTML = menu.classList.contains("open") ? "&#9650;" : "&#9660;";
}

// Calendar functionality
document.addEventListener('DOMContentLoaded', function() {
  const calendarDays = document.getElementById('calendarDays');
  const prevMonthBtn = document.getElementById('prevMonth');
  const nextMonthBtn = document.getElementById('nextMonth');
  const monthYearDisplay = document.querySelector('.calendar-title');
  
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();
  
  function renderCalendar() {
    calendarDays.innerHTML = '';
    
    // Set the month and year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    monthYearDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // Get first day of month and days in month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Previous month days
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    
    // Fill in previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = document.createElement('div');
      day.classList.add('calendar-day');
      day.textContent = prevMonthDays - i;
      day.style.opacity = '0.5';
      calendarDays.appendChild(day);
    }
    
    // Current month days
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const day = document.createElement('div');
      day.classList.add('calendar-day');
      day.textContent = i;
      
      // Highlight today
      if (i === today.getDate() && 
          currentMonth === today.getMonth() && 
          currentYear === today.getFullYear()) {
        day.classList.add('today');
      }
      
      // Add event indicator for some days
      if ([3, 8, 15, 22, 27].includes(i)) {
        day.classList.add('event');
      }
      
      calendarDays.appendChild(day);
    }
    
    // Next month days
    const totalCells = 42; // 6 rows * 7 days
    const remaining = totalCells - (firstDay + daysInMonth);
    
    for (let i = 1; i <= remaining; i++) {
      const day = document.createElement('div');
      day.classList.add('calendar-day');
      day.textContent = i;
      day.style.opacity = '0.5';
      calendarDays.appendChild(day);
    }
  }
  
  // Navigation
  prevMonthBtn.addEventListener('click', function() {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });
  
  nextMonthBtn.addEventListener('click', function() {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });
  
  // Initial render
  renderCalendar();
});