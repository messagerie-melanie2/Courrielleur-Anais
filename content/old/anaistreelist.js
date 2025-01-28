    let selectedItem = null;
    const contextMenu = document.getElementById('context-menu');

    // Function to handle item click
    function anaisArbreClic(event) {
        const target = event.target;
        if (target.tagName === 'LI') {
            // Clear previous selection
            if (selectedItem) {
                selectedItem.classList.remove('selected');
            }
            // Set new selected item
            selectedItem = target;
            selectedItem.classList.add('selected');
            // Your custom click handling code
            console.log('Item clicked:', target.textContent);
        }
    }

    // Function to handle item double-click
    function anaisArbreDblClic(event) {
        const target = event.target;
        if (target.tagName === 'LI') {
            // Your custom double-click handling code
            console.log('Item double-clicked:', target.textContent);
        }
    }

    // Function to handle keypress for deletion
    function anaisArbreSupRech(event) {
        if (selectedItem && event.key === 'Delete') {
            const itemText = selectedItem.textContent;
            selectedItem.remove(); // Remove selected item
            selectedItem = null; // Clear selection
            console.log('Removed item:', itemText);
        }
    }

    // Function to show context menu
    function showContextMenu(event) {
        event.preventDefault(); // Prevent default context menu
        contextMenu.style.display = 'block';
        contextMenu.style.left = event.pageX + 'px';
        contextMenu.style.top = event.pageY + 'px';
    }

    // Function to delete the selected item from context menu
    function deleteSelectedItem() {
        if (selectedItem) {
            const itemText = selectedItem.textContent;
            selectedItem.remove(); // Remove the selected item
            selectedItem = null; // Clear selection
            contextMenu.style.display = 'none'; // Hide context menu
            console.log('Removed item from context menu:', itemText);
        }
    }

    // Initialize event listeners
    document.addEventListener('DOMContentLoaded', function() {
        const list = document.getElementById('anaismoz-arbre');
        list.addEventListener('click', anaisArbreClic);
        list.addEventListener('dblclick', anaisArbreDblClic);
        document.addEventListener('keypress', anaisArbreSupRech);
        document.addEventListener('contextmenu', showContextMenu);
        document.addEventListener('click', function() {
            contextMenu.style.display = 'none'; // Hide context menu on click
        });
    });