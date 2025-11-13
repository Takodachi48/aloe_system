// Forum page initialization
document.addEventListener('DOMContentLoaded', function() {
    // Set active page
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById('forumPage').classList.add('active');

    // Update header for forum page
    if (typeof updateHeaderForPage === 'function') {
        updateHeaderForPage('forum');
    }

    // Load header and sidebar components
    fetch('components/header/app-header.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('header-container').innerHTML = html;
            // Initialize header scripts if needed
            if (typeof initHeader === 'function') initHeader();
        });

    fetch('components/sidebar/app-sidebar.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('sidebar-container').innerHTML = html;
            // Modify nav items to link back to index.html with page parameter
            document.querySelectorAll('.nav-item[data-page]').forEach(item => {
                const pageId = item.getAttribute('data-page');
                item.setAttribute('href', `index.html?page=${pageId}`);
                item.classList.add('external-link');
            });
            // Initialize sidebar scripts if needed
            if (typeof initSidebar === 'function') initSidebar();
            // Add active class to forum link
            const forumLink = document.querySelector('#forumLink');
            if (forumLink) {
                document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
                forumLink.classList.add('active');
            }
        });

    // Add event listener for create post button
    const createPostBtn = document.getElementById('createPostBtn');
    if (createPostBtn) {
        createPostBtn.addEventListener('click', function(e) {
            e.preventDefault();
            alert('New post functionality will be implemented in the next phase!');
        });
    }
});