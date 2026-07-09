<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Palimpsest</title>
    <style>
        :root {
            --bg-color: #fcfbfa;
            --text-main: #1c1b1a;
            --text-muted: #706e6b;
            --border-color: #e6e4e0;
            --accent-color: #5c6b60; /* Muted olive/sage */
            --resurface-highlight: #f4eae1; /* Soft parchment highlight */
            --font-serif: "Adobe Caslon Pro", "Garamond", "Georgia", serif;
            --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            background-color: var(--bg-color);
            color: var(--text-main);
            font-family: var(--font-sans);
            line-height: 1.6;
            padding-bottom: 100px; /* Space for FAB */
        }

        /* Header / Action Bar */
        header {
            position: sticky;
            top: 0;
            background: rgba(252, 251, 250, 0.95);
            backdrop-filter: blur(8px);
            border-bottom: 1px solid var(--border-color);
            padding: 1.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            z-index: 10;
        }

        h1 {
            font-family: var(--font-serif);
            font-size: 1.5rem;
            font-weight: 600;
            letter-spacing: -0.5px;
        }

        .header-actions button {
            background: none;
            border: 1px solid var(--border-color);
            padding: 0.5rem 1rem;
            border-radius: 4px;
            font-family: var(--font-sans);
            font-size: 0.85rem;
            cursor: pointer;
            transition: all 0.2s;
        }

        .header-actions button:hover {
            background: var(--border-color);
        }

        /* The Prominent Feed Container */
        main {
            max-width: 650px;
            margin: 0 auto;
            padding: 1.5rem;
        }

        .feed-item {
            border-bottom: 1px solid var(--border-color);
            padding: 2.5rem 0;
            position: relative;
        }

        /* Special styling for resurfaced items to catch your eye */
        .feed-item.resurfaced {
            background-color: var(--resurface-highlight);
            margin: 1rem -1.5rem;
            padding: 2.5rem 1.5rem;
            border-radius: 8px;
            border-bottom: none;
        }

        .item-meta {
            font-size: 0.8rem;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 0.75rem;
            display: flex;
            justify-content: space-between;
        }

        .item-tag {
            font-weight: 600;
            color: var(--accent-color);
        }

        .item-text {
            font-family: var(--font-serif);
            font-size: 1.2rem;
            color: var(--text-main);
            white-space: pre-wrap;
            margin-bottom: 1rem;
        }

        .item-image {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin-top: 0.5rem;
            filter: sepia(10%) contrast(95%); /* Softens digital harshness */
        }

        .item-actions {
            display: flex;
            gap: 1rem;
            margin-top: 1rem;
        }

        .action-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 0.85rem;
            cursor: pointer;
            text-decoration: underline;
        }

        .action-btn:hover {
            color: var(--text-main);
        }

        /* Floating Action Button (FAB) */
        .fab {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background-color: var(--text-main);
            color: var(--bg-color);
            border: none;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            z-index: 100;
            transition: transform 0.2s;
        }

        .fab:hover {
            transform: scale(1.05);
        }

        /* Overlay / Drawer Writing Section */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.4);
            display: flex;
            align-items: flex-end; /* Slides up from bottom on mobile */
            justify-content: center;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
            z-index: 200;
        }

        .modal-overlay.active {
            opacity: 1;
            pointer-events: auto;
        }

        .modal-content {
            background: var(--bg-color);
            width: 100%;
            max-width: 600px;
            border-top-left-radius: 16px;
            border-top-right-radius: 16px;
            padding: 2rem;
            transform: translateY(100%);
            transition: transform 0.3s ease;
            box-shadow: 0 -8px 24px rgba(0,0,0,0.1);
        }

        .modal-overlay.active .modal-content {
            transform: translateY(0);
        }

        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }

        /* Input Controls styling */
        .write-textarea {
            width: 100%;
            height: 150px;
            border: 1px solid var(--border-color);
            background: transparent;
            padding: 1rem;
            font-family: var(--font-serif);
            font-size: 1.1rem;
            resize: none;
            outline: none;
            margin-bottom: 1rem;
            border-radius: 4px;
        }

        .write-input-row {
            display: flex;
            gap: 1rem;
            margin-bottom: 1.5rem;
        }

        .write-input {
            flex: 1;
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            background: transparent;
            border-radius: 4px;
            font-family: var(--font-sans);
        }

        .submit-btn {
            background: var(--accent-color);
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            width: 100%;
        }
    </style>
</head>
<body>

    <header>
        <h1>Palimpsest</h1>
        <div class="header-actions">
            <button id="resurface-trigger" title="Bring older entries back to light">Resurface Old Thoughts</button>
        </div>
    </header>

    <main id="feed-container">
        <!-- Sample Entry Structure for reference -->
        <article class="feed-item resurfaced">
            <div class="item-meta">
                <span class="item-tag">#cinematography</span>
                <span class="item-revision">Rev. III</span>
            </div>
            <p class="item-text">The way light cuts across a frame isn't just about visibility—it's architecture. Early black and white masters didn't shoot objects; they shot the contrast between density and absence.</p>
            <div class="item-actions">
                <button class="action-btn">Overwrite</button>
            </div>
        </article>
        
        <article class="feed-item">
            <div class="item-meta">
                <span class="item-tag">#prose-style</span>
                <span class="item-revision">Original</span>
            </div>
            <p class="item-text">Keep the sentences close to the bone. If a phrase doesn't earn its keep, strike it through. Let the blank space do the heavy lifting.</p>
            <div class="item-actions">
                <button class="action-btn">Overwrite</button>
            </div>
        </article>
    </main>

    <!-- Floating Action Button -->
    <button class="fab" id="open-writer-btn" aria-label="Compose new thought">+</button>

    <!-- Modal Drawer for Composing / Overwriting -->
    <div class="modal-overlay" id="writer-modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="modal-title" style="font-family: var(--font-serif);">Commit to Layer</h3>
                <button class="action-btn" id="close-writer-btn">Cancel</button>
            </div>
            <form id="note-form">
                <textarea class="write-textarea" id="note-text" placeholder="Write your reflection..."></textarea>
                <div class="write-input-row">
                    <input type="text" class="write-input" id="note-tag" placeholder="Topic tag (e.g., #anatomy)">
                    <input type="file" id="note-photo" accept="image/*" style="display:none;">
                    <button type="button" class="write-input" onclick="document.getElementById('note-photo').click()">Attach Image</button>
                </div>
                <button type="submit" class="submit-btn">Let it Settle</button>
            </form>
        </div>
    </div>

    <script>
        // DOM Elements for Modal Interactivity
        const modal = document.getElementById('writer-modal');
        const openBtn = document.getElementById('open-writer-btn');
        const closeBtn = document.getElementById('close-writer-btn');

        openBtn.addEventListener('click', () => {
            document.getElementById('modal-title').textContent = "New Layer";
            modal.classList.add('active');
        });

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        // Close modal if user clicks outside the content panel
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    </script>
</body>
</html>
