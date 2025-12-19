import { test, expect } from '@playwright/test';

test.describe('74min Smoke Tests', () => {
    test.beforeEach(async ({ page }) => {
        // We assume the server is running on localhost:3000 during local testing
        await page.goto('http://localhost:3000');
    });

    test('Page title and main elements are visible', async ({ page }) => {
        await expect(page).toHaveTitle(/74min/);
        await expect(page.locator('#cd-element')).toBeVisible();
        await expect(page.locator('#track-list')).toBeVisible();
    });

    test('Switching media between CD and Cassette', async ({ page }) => {
        const toggleBtn = page.locator('#media-toggle');
        const cdElement = page.locator('#cd-element');
        const cassElement = page.locator('#cassette-element');

        // Initially CD is visible (or whichever is default)
        // Click to switch to Cassette
        await toggleBtn.click();
        await expect(cassElement).not.toHaveClass(/hidden/);
        await expect(cdElement).toHaveClass(/hidden/);

        // Click again to switch back to CD
        await toggleBtn.click();
        await expect(cdElement).not.toHaveClass(/hidden/);
        await expect(cassElement).toHaveClass(/hidden/);
    });

    test('Interactive label writing on cassette sticker', async ({ page }) => {
        // Switch to cassette first
        await page.locator('#media-toggle').click();

        const sticker = page.locator('#cassette-sticker');
        const stickerTag = page.locator('#cassette-title-tag');
        const stickerInput = page.locator('#cassette-title-input');

        // Click sticker to edit
        await sticker.click();
        await expect(stickerInput).toBeVisible();
        await expect(stickerTag).toHaveClass(/hidden/);

        // Type a new title and press Enter
        const newTitle = 'Late Night Lo-Fi';
        await stickerInput.fill(newTitle);
        await stickerInput.press('Enter');

        // Check if input is hidden and tag is visible with writing class
        await expect(stickerInput).toHaveClass(/hidden/);
        await expect(stickerTag).not.toHaveClass(/hidden/);
        await expect(stickerTag).toHaveText(newTitle);
        await expect(stickerTag).toHaveClass(/writing/);
    });

    test('About modal opens and closes', async ({ page }) => {
        const aboutBtn = page.locator('#about-btn');
        const aboutModal = page.locator('#about-modal');
        const closeBtn = page.locator('#close-about-modal');

        await aboutBtn.click();
        await expect(aboutModal).not.toHaveClass(/hidden/);

        await closeBtn.click();
        await expect(aboutModal).toHaveClass(/hidden/);
    });
});
