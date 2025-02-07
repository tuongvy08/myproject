let currentPage = 1;
let totalPages = 1;
const pageSize = 30; // Số kết quả trên mỗi trang, bạn có thể điều chỉnh

function searchProducts() {
    const codes = Array.from(document.querySelectorAll('input[name="code"]'))
        .map(input => input.value.trim())
        .filter(code => code !== '');

    // Reset trang hiện tại về 1 khi thực hiện tìm kiếm mới
    currentPage = 1;

    fetchResults(codes, currentPage);
}

function fetchResults(codes, page) {
    fetch("/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ codes, page, page_size: pageSize }),
    })
        .then((response) => response.json())
        .then((data) => {
            totalPages = data.total_pages;
            currentPage = data.current_page;

            // Hiển thị kết quả
            displayResults(data.results);

            // Hiển thị các nút phân trang
            updatePaginationControls();

            // Lưu danh sách codes hiện tại
            window.currentCodes = codes;
        });
}

function displayResults(results) {
    // Clear previous results
    const resultsTableBody = document.querySelector("#results-table tbody");
    resultsTableBody.innerHTML = ''; // Xóa nội dung cũ

    results.forEach((result) => {
        const row = document.createElement('tr');

        // Tạo các ô và thêm vào hàng
        const cellName = document.createElement('td');
        cellName.textContent = result.Name || '';
        row.appendChild(cellName);

        const cellCode = document.createElement('td');
        cellCode.textContent = result.Code || '';
        row.appendChild(cellCode);

        const cellCAS = document.createElement('td');
        cellCAS.textContent = result.CAS || '';
        row.appendChild(cellCAS);

        const cellBrand = document.createElement('td');
        cellBrand.textContent = result.Brand || '';
        row.appendChild(cellBrand);

        const cellSize = document.createElement('td');
        cellSize.textContent = result.Size || '';
        row.appendChild(cellSize);

        const cellUnitPrice = document.createElement('td');
        if (result.Unit_price !== undefined && result.Unit_price !== '') {
            cellUnitPrice.textContent = Number(result.Unit_price).toLocaleString('en-US');
        } else {
            cellUnitPrice.textContent = '';
        }
        row.appendChild(cellUnitPrice);

        const cellNote = document.createElement('td');
        cellNote.textContent = result.Note || '';
        row.appendChild(cellNote);

        // Kiểm tra và áp dụng lớp CSS nếu có WarningType
        if (result.WarningType) {
            let cssClass = '';
            if (result.WarningType === 'CẤM NHẬP') {
                cssClass = 'warning-cam-nhap';
            } else if (result.WarningType === 'Phụ lục II') {
                cssClass = 'warning-phu-luc-ii';
            } else if (result.WarningType === 'TỒN KHO') {
                cssClass = 'warning-ton-kho';
            }
            row.classList.add(cssClass);
        }

        // Thêm hàng vào bảng
        resultsTableBody.appendChild(row);
    });

    // Hiển thị phần kết quả
    document.getElementById("search-form").style.display = "none";
    document.getElementById("results-section").classList.remove("hidden");
}

function updatePaginationControls() {
    const paginationContainer = document.getElementById('pagination-controls');
    paginationContainer.innerHTML = ''; // Xóa các nút cũ

    // Nút Trang Trước
    const prevButton = document.createElement('button');
    prevButton.textContent = 'Trang Trước';
    prevButton.disabled = currentPage <= 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchResults(window.currentCodes, currentPage);
        }
    });
    paginationContainer.appendChild(prevButton);

    // Hiển thị số trang hiện tại
    const pageInfo = document.createElement('span');
    pageInfo.textContent = ` Trang ${currentPage} / ${totalPages} `;
    paginationContainer.appendChild(pageInfo);

    // Nút Trang Sau
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Trang Sau';
    nextButton.disabled = currentPage >= totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            fetchResults(window.currentCodes, currentPage);
        }
    });
    paginationContainer.appendChild(nextButton);
}

function getCurrentCodes() {
    // Lấy danh sách codes hiện tại từ input
    return Array.from(document.querySelectorAll('input[name="code"]'))
        .map(input => input.value.trim())
        .filter(code => code !== '');
}

// Sửa lại sự kiện gửi form
document.getElementById("search-form").addEventListener("submit", function (e) {
    e.preventDefault();
    searchProducts();
});

// Nút "Quay lại"
document.getElementById("back-button").addEventListener("click", function () {
    // Reset các giá trị phân trang
    currentPage = 1;
    totalPages = 1;

    // Hiển thị lại form tìm kiếm
    document.getElementById("search-form").style.display = "block";
    document.getElementById("results-section").classList.add("hidden");

    // Xóa nội dung bảng kết quả
    const resultsTableBody = document.querySelector("#results-table tbody");
    resultsTableBody.innerHTML = '';

    // Xóa các nút phân trang
    const paginationContainer = document.getElementById('pagination-controls');
    paginationContainer.innerHTML = '';

    // Xóa các giá trị input
    const codeInputs = document.querySelectorAll('input[name="code"]');
    codeInputs.forEach(input => input.value = '');
});

// Handle paste event for the first input
document.querySelector('input[name="code"]').addEventListener('paste', function (e) {
    // Get the pasted data
    const data = e.clipboardData.getData('text');
    // Split the data by line breaks
    const lines = data.split('\n');
    // Get all the code inputs
    const codeInputs = document.querySelectorAll('input[name="code"]');
    // Set the value for each input
    lines.forEach((line, index) => {
        if (index < codeInputs.length) {
            codeInputs[index].value = line.trim();
        }
    });
    // Prevent the default paste behavior
    e.preventDefault();
});
