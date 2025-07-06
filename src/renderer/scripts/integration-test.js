// Frontend-Backend Integration Test
// This script tests the connection between the frontend and backend

console.log('🧪 Starting Frontend-Backend Integration Test...');

async function testFrontendBackendIntegration() {
    const results = {
        preloadAPI: false,
        appVersion: false,
        databaseConnection: false,
        youtubeValidation: false,
        downloadQueue: false,
        overallStatus: 'UNKNOWN'
    };

    try {
        // Test 1: Check if electronAPI is available
        console.log('Test 1: Checking electronAPI availability...');
        if (window.electronAPI) {
            results.preloadAPI = true;
            console.log('✅ electronAPI is available');
        } else {
            console.log('❌ electronAPI is not available');
            return results;
        }

        // Test 2: Test basic app communication
        console.log('Test 2: Testing app version retrieval...');
        try {
            const version = await window.electronAPI.getVersion();
            if (version) {
                results.appVersion = true;
                console.log(`✅ App version retrieved: ${version}`);
            }
        } catch (error) {
            console.log('❌ Failed to get app version:', error);
        }

        // Test 3: Test database connection
        console.log('Test 3: Testing database connection...');
        try {
            const playlists = await window.electronAPI.database.getPlaylists();
            if (Array.isArray(playlists)) {
                results.databaseConnection = true;
                console.log(`✅ Database connection successful. Found ${playlists.length} playlists`);
            }
        } catch (error) {
            console.log('❌ Database connection failed:', error);
        }

        // Test 4: Test YouTube validation
        console.log('Test 4: Testing YouTube URL validation...');
        try {
            const validation = await window.electronAPI.youtube.validateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
            if (validation && validation.hasOwnProperty('isValid')) {
                results.youtubeValidation = true;
                console.log(`✅ YouTube validation working. Test URL valid: ${validation.isValid}`);
            }
        } catch (error) {
            console.log('❌ YouTube validation failed:', error);
        }

        // Test 5: Test download queue
        console.log('Test 5: Testing download queue access...');
        try {
            const queue = await window.electronAPI.downloads.getDownloadQueue();
            if (Array.isArray(queue)) {
                results.downloadQueue = true;
                console.log(`✅ Download queue accessible. Found ${queue.length} items`);
            }
        } catch (error) {
            console.log('❌ Download queue access failed:', error);
        }

        // Calculate overall status
        const successCount = Object.values(results).filter(r => r === true).length;
        const totalTests = Object.keys(results).length - 1; // Exclude overallStatus
        
        if (successCount === totalTests) {
            results.overallStatus = 'EXCELLENT';
            console.log('🎉 ALL TESTS PASSED! Frontend-Backend integration is working perfectly!');
        } else if (successCount >= totalTests * 0.75) {
            results.overallStatus = 'GOOD';
            console.log('✅ Most tests passed. Frontend-Backend integration is mostly working.');
        } else if (successCount >= totalTests * 0.5) {
            results.overallStatus = 'PARTIAL';
            console.log('⚠️  Some tests failed. Frontend-Backend integration has issues.');
        } else {
            results.overallStatus = 'POOR';
            console.log('❌ Many tests failed. Frontend-Backend integration needs attention.');
        }

        console.log('📊 Test Results Summary:', results);
        return results;

    } catch (error) {
        console.error('🚨 Integration test failed with error:', error);
        results.overallStatus = 'ERROR';
        return results;
    }
}

// Auto-run the test when the page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(testFrontendBackendIntegration, 1000);
    });
} else {
    setTimeout(testFrontendBackendIntegration, 1000);
}

// Also expose the test function globally for manual testing
window.testFrontendBackendIntegration = testFrontendBackendIntegration;
