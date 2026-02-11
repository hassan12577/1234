// DOM elements
const uploadForm = document.getElementById('upload-form');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const booksList = document.getElementById('books-list');
const darkModeToggle = document.getElementById('dark-mode-toggle');

// State
let books = [];
let categories = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadBooks();
  setupEventListeners();
  checkDarkMode();
});

// Event listeners
function setupEventListeners() {
  uploadForm.addEventListener('submit', handleUpload);
  searchInput.addEventListener('input', debounce(handleSearch, 300));
  categoryFilter.addEventListener('change', handleSearch);
  darkModeToggle.addEventListener('click', toggleDarkMode);
}

// Load categories
async function loadCategories() {
  try {
    const response = await fetch('/api/categories');
    categories = await response.json();
    populateCategoryFilter();
  } catch (error) {
    console.error('Error loading categories:', error);
  }
}

// Populate category filter
function populateCategoryFilter() {
  categoryFilter.innerHTML = '<option value="">جميع الفئات</option>';
  categories.forEach(category => {
    const option = document.createElement('option');
    option.value = category.name;
    option.textContent = category.name;
    categoryFilter.appendChild(option);
  });
}

// Load books
async function loadBooks() {
  try {
    showLoading();
    const response = await fetch('/api/books');
    books = await response.json();
    displayBooks(books);
  } catch (error) {
    console.error('Error loading books:', error);
    showError('فشل في تحميل الكتب. يرجى المحاولة مرة أخرى.');
  }
}

// Handle upload
async function handleUpload(e) {
  e.preventDefault();

  const formData = new FormData();
  formData.append('title', document.getElementById('book-title').value);
  formData.append('author', document.getElementById('book-author').value);
  formData.append('description', document.getElementById('book-description').value);
  formData.append('category', document.getElementById('book-category').value || 'غير مصنف');
  formData.append('file', document.getElementById('book-file').files[0]);

  try {
    const response = await fetch('/api/books', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      showSuccess(result.message);
      uploadForm.reset();
      loadBooks();
    } else {
      const error = await response.json();
      showError(error.error);
    }
  } catch (error) {
    console.error('Error uploading book:', error);
    showError('فشل في رفع الكتاب. يرجى المحاولة مرة أخرى.');
  }
}

// Handle search
function handleSearch() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedCategory = categoryFilter.value;

  const filteredBooks = books.filter(book => {
    const matchesSearch = book.title.toLowerCase().includes(searchTerm) ||
                         book.author.toLowerCase().includes(searchTerm);
    const matchesCategory = !selectedCategory || book.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  displayBooks(filteredBooks);
}

// Display books
function displayBooks(booksToDisplay) {
  booksList.innerHTML = '';

  if (booksToDisplay.length === 0) {
    booksList.innerHTML = '<div class="no-books">لا توجد كتب متاحة.</div>';
    return;
  }

  booksToDisplay.forEach(book => {
    const bookElement = createBookElement(book);
    booksList.appendChild(bookElement);
  });
}

// Create book element
function createBookElement(book) {
  const bookDiv = document.createElement('div');
  bookDiv.className = 'book-item';
  bookDiv.setAttribute('role', 'listitem');

  const ratingHtml = createRatingHtml(book);

  bookDiv.innerHTML = `
    <h3>${book.title}</h3>
    <p class="author">بواسطة: ${book.author}</p>
    <p>الفئة: ${book.category}</p>
    ${book.description ? `<p>${book.description}</p>` : ''}
    ${ratingHtml}
    <a href="/api/books/${book.id}/download" download aria-label="تحميل كتاب ${book.title}">تحميل الكتاب</a>
  `;

  // Add rating functionality
  const stars = bookDiv.querySelectorAll('.star');
  stars.forEach((star, index) => {
    star.addEventListener('click', () => updateRating(book.id, index + 1));
    star.setAttribute('aria-label', `تقييم ${index + 1} نجوم`);
    star.setAttribute('role', 'button');
    star.setAttribute('tabindex', '0');
    star.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        updateRating(book.id, index + 1);
      }
    });
  });

  return bookDiv;
}

// Create rating HTML
function createRatingHtml(book) {
  const rating = Math.floor(book.rating);
  let starsHtml = '';

  for (let i = 1; i <= 5; i++) {
    starsHtml += `<span class="star ${i <= rating ? 'active' : ''}" data-rating="${i}">★</span>`;
  }

  return `
    <div class="rating">
      <div class="stars">${starsHtml}</div>
      <span class="rating-value">${book.rating.toFixed(1)}</span>
    </div>
  `;
}

// Update rating
async function updateRating(bookId, rating) {
  try {
    const response = await fetch(`/api/books/${bookId}/rating`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating })
    });

    if (response.ok) {
      // Update local book data
      const book = books.find(b => b.id === bookId);
      if (book) {
        book.rating = rating;
        loadBooks(); // Refresh display
      }
    } else {
      const error = await response.json();
      showError(error.error);
    }
  } catch (error) {
    console.error('Error updating rating:', error);
    showError('فشل في تحديث التقييم.');
  }
}

// Dark mode toggle
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark);
  updateDarkModeIcon(isDark);
}

// Check dark mode on load
function checkDarkMode() {
  const isDark = localStorage.getItem('darkMode') === 'true';
  if (isDark) {
    document.body.classList.add('dark-mode');
  }
  updateDarkModeIcon(isDark);
}

// Update dark mode icon
function updateDarkModeIcon(isDark) {
  darkModeToggle.textContent = isDark ? '☀️' : '🌙';
  darkModeToggle.title = isDark ? 'تبديل الوضع الفاتح' : 'تبديل الوضع المظلم';
}

// Utility functions
function showLoading() {
  booksList.innerHTML = '<div class="loading">جاري التحميل...</div>';
}

function showError(message) {
  // Simple error display - you can enhance this
  alert(message);
}

function showSuccess(message) {
  // Simple success display - you can enhance this
  alert(message);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
