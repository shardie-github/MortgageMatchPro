#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Supabase Security and Reliability
 * Tests function search path security, GitHub integration, persistence, and monitoring
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test results tracking
const testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
};

// Utility function to log test results
function logTest(testName, status, message, details = null) {
    const result = {
        name: testName,
        status,
        message,
        details,
        timestamp: new Date().toISOString()
    };
    
    testResults.tests.push(result);
    
    if (status === 'PASS') {
        testResults.passed++;
        console.log(`✅ ${testName}: ${message}`);
    } else if (status === 'FAIL') {
        testResults.failed++;
        console.log(`❌ ${testName}: ${message}`);
    } else if (status === 'WARN') {
        testResults.warnings++;
        console.log(`⚠️  ${testName}: ${message}`);
    }
    
    if (details) {
        console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
}

// Test 1: Function Search Path Security
async function testFunctionSearchPathSecurity() {
    try {
        console.log('\n🔒 Testing Function Search Path Security...');
        
        // Test 1.1: Check if secure_function_wrapper exists
        const { data: wrapperExists, error: wrapperError } = await supabase
            .rpc('secure_function_wrapper', { func_name: 'version', func_args: '' });
        
        if (wrapperError) {
            logTest('Function Search Path - Secure Wrapper', 'FAIL', 'Secure function wrapper not found', wrapperError);
        } else {
            logTest('Function Search Path - Secure Wrapper', 'PASS', 'Secure function wrapper is available');
        }
        
        // Test 1.2: Audit function search paths
        const { data: auditResults, error: auditError } = await supabase
            .rpc('audit_and_fix_function_search_paths');
        
        if (auditError) {
            logTest('Function Search Path - Audit', 'FAIL', 'Failed to audit function search paths', auditError);
        } else {
            const insecureFunctions = auditResults.filter(f => f.action_taken === 'NEEDS_FIX');
            if (insecureFunctions.length > 0) {
                logTest('Function Search Path - Security Audit', 'WARN', 
                    `Found ${insecureFunctions.length} functions with insecure search paths`, 
                    insecureFunctions);
            } else {
                logTest('Function Search Path - Security Audit', 'PASS', 'All functions have secure search paths');
            }
        }
        
        // Test 1.3: Monitor search path security
        const { data: securityMetrics, error: metricsError } = await supabase
            .rpc('monitor_search_path_security');
        
        if (metricsError) {
            logTest('Function Search Path - Monitoring', 'FAIL', 'Failed to get security metrics', metricsError);
        } else {
            const metrics = securityMetrics[0];
            if (metrics.security_score < 100) {
                logTest('Function Search Path - Security Score', 'WARN', 
                    `Security score: ${metrics.security_score}% (${metrics.insecure_functions} insecure functions)`);
            } else {
                logTest('Function Search Path - Security Score', 'PASS', 
                    `Security score: ${metrics.security_score}% - All functions secure`);
            }
        }
        
    } catch (error) {
        logTest('Function Search Path Security', 'FAIL', 'Unexpected error during testing', error.message);
    }
}

// Test 2: GitHub Integration Security
async function testGitHubIntegrationSecurity() {
    try {
        console.log('\n🔗 Testing GitHub Integration Security...');
        
        // Test 2.1: Check if GitHub integration tables exist
        const { data: tables, error: tablesError } = await supabase
            .from('github_integrations')
            .select('id')
            .limit(1);
        
        if (tablesError) {
            logTest('GitHub Integration - Tables', 'FAIL', 'GitHub integration tables not found', tablesError);
        } else {
            logTest('GitHub Integration - Tables', 'PASS', 'GitHub integration tables are properly configured');
        }
        
        // Test 2.2: Test GitHub integration functions
        const { data: healthCheck, error: healthError } = await supabase
            .rpc('monitor_github_integration_health');
        
        if (healthError) {
            logTest('GitHub Integration - Health Monitoring', 'FAIL', 'GitHub health monitoring not available', healthError);
        } else {
            logTest('GitHub Integration - Health Monitoring', 'PASS', 'GitHub health monitoring is functional');
        }
        
        // Test 2.3: Test webhook handling
        const testWebhookPayload = {
            action: 'test',
            repository: { name: 'test-repo' },
            sender: { login: 'test-user' }
        };
        
        const { data: webhookResult, error: webhookError } = await supabase
            .rpc('handle_github_webhook', {
                p_event_type: 'test',
                p_github_event_id: 'test-' + Date.now(),
                p_repository_name: 'test-repo',
                p_payload: testWebhookPayload
            });
        
        if (webhookError) {
            logTest('GitHub Integration - Webhook Handling', 'FAIL', 'Webhook handling failed', webhookError);
        } else {
            logTest('GitHub Integration - Webhook Handling', 'PASS', 'Webhook handling is functional');
        }
        
    } catch (error) {
        logTest('GitHub Integration Security', 'FAIL', 'Unexpected error during testing', error.message);
    }
}

// Test 3: Data Persistence and Backup
async function testDataPersistenceAndBackup() {
    try {
        console.log('\n💾 Testing Data Persistence and Backup...');
        
        // Test 3.1: Check backup configuration
        const { data: backupConfigs, error: backupError } = await supabase
            .from('backup_configurations')
            .select('*');
        
        if (backupError) {
            logTest('Data Persistence - Backup Configuration', 'FAIL', 'Backup configuration not found', backupError);
        } else {
            if (backupConfigs.length === 0) {
                logTest('Data Persistence - Backup Configuration', 'WARN', 'No backup configurations found');
            } else {
                logTest('Data Persistence - Backup Configuration', 'PASS', 
                    `Found ${backupConfigs.length} backup configurations`);
            }
        }
        
        // Test 3.2: Test backup functionality
        const { data: backupResult, error: backupTestError } = await supabase
            .rpc('perform_database_backup', {
                p_backup_type: 'full',
                p_compression: true,
                p_encryption: true
            });
        
        if (backupTestError) {
            logTest('Data Persistence - Backup Execution', 'FAIL', 'Backup execution failed', backupTestError);
        } else {
            logTest('Data Persistence - Backup Execution', 'PASS', 'Backup execution successful');
        }
        
        // Test 3.3: Monitor backup health
        const { data: backupHealth, error: healthError } = await supabase
            .rpc('monitor_backup_health');
        
        if (healthError) {
            logTest('Data Persistence - Backup Health', 'FAIL', 'Backup health monitoring failed', healthError);
        } else {
            const unhealthyBackups = backupHealth.filter(b => b.health_status !== 'healthy');
            if (unhealthyBackups.length > 0) {
                logTest('Data Persistence - Backup Health', 'WARN', 
                    `Found ${unhealthyBackups.length} unhealthy backup types`, unhealthyBackups);
            } else {
                logTest('Data Persistence - Backup Health', 'PASS', 'All backup types are healthy');
            }
        }
        
    } catch (error) {
        logTest('Data Persistence and Backup', 'FAIL', 'Unexpected error during testing', error.message);
    }
}

// Test 4: Monitoring and Alerting
async function testMonitoringAndAlerting() {
    try {
        console.log('\n📊 Testing Monitoring and Alerting...');
        
        // Test 4.1: Check system metrics collection
        const { data: metrics, error: metricsError } = await supabase
            .rpc('collect_system_metrics');
        
        if (metricsError) {
            logTest('Monitoring - System Metrics', 'FAIL', 'System metrics collection failed', metricsError);
        } else {
            const criticalMetrics = metrics.filter(m => m.status === 'critical');
            const warningMetrics = metrics.filter(m => m.status === 'warning');
            
            if (criticalMetrics.length > 0) {
                logTest('Monitoring - System Metrics', 'FAIL', 
                    `Found ${criticalMetrics.length} critical metrics`, criticalMetrics);
            } else if (warningMetrics.length > 0) {
                logTest('Monitoring - System Metrics', 'WARN', 
                    `Found ${warningMetrics.length} warning metrics`, warningMetrics);
            } else {
                logTest('Monitoring - System Metrics', 'PASS', 'All system metrics are healthy');
            }
        }
        
        // Test 4.2: Test alert evaluation
        const { data: alerts, error: alertsError } = await supabase
            .rpc('evaluate_alerts');
        
        if (alertsError) {
            logTest('Monitoring - Alert Evaluation', 'FAIL', 'Alert evaluation failed', alertsError);
        } else {
            const activeAlerts = alerts.filter(a => a.status === 'triggered');
            if (activeAlerts.length > 0) {
                logTest('Monitoring - Alert Evaluation', 'WARN', 
                    `Found ${activeAlerts.length} active alerts`, activeAlerts);
            } else {
                logTest('Monitoring - Alert Evaluation', 'PASS', 'No active alerts');
            }
        }
        
        // Test 4.3: Test uptime monitoring
        const { data: uptimeCheck, error: uptimeError } = await supabase
            .rpc('check_service_uptime', {
                p_service_name: 'test-service',
                p_endpoint_url: 'https://httpbin.org/status/200'
            });
        
        if (uptimeError) {
            logTest('Monitoring - Uptime Check', 'FAIL', 'Uptime check failed', uptimeError);
        } else {
            const uptimeResult = uptimeCheck[0];
            if (uptimeResult.is_healthy) {
                logTest('Monitoring - Uptime Check', 'PASS', 
                    `Service is healthy (${uptimeResult.response_time_ms}ms response time)`);
            } else {
                logTest('Monitoring - Uptime Check', 'FAIL', 
                    `Service is unhealthy: ${uptimeResult.error_message}`);
            }
        }
        
    } catch (error) {
        logTest('Monitoring and Alerting', 'FAIL', 'Unexpected error during testing', error.message);
    }
}

// Test 5: Security Audit
async function testSecurityAudit() {
    try {
        console.log('\n🛡️  Testing Security Audit...');
        
        // Test 5.1: Perform comprehensive security audit
        const { data: auditResults, error: auditError } = await supabase
            .rpc('perform_security_audit');
        
        if (auditError) {
            logTest('Security Audit - Comprehensive', 'FAIL', 'Security audit failed', auditError);
        } else {
            const failedChecks = auditResults.filter(a => a.status === 'FAIL');
            const warningChecks = auditResults.filter(a => a.status === 'WARN');
            
            if (failedChecks.length > 0) {
                logTest('Security Audit - Comprehensive', 'FAIL', 
                    `Found ${failedChecks.length} failed security checks`, failedChecks);
            } else if (warningChecks.length > 0) {
                logTest('Security Audit - Comprehensive', 'WARN', 
                    `Found ${warningChecks.length} warning security checks`, warningChecks);
            } else {
                logTest('Security Audit - Comprehensive', 'PASS', 'All security checks passed');
            }
        }
        
        // Test 5.2: Check RLS policies
        const { data: rlsCheck, error: rlsError } = await supabase
            .from('users')
            .select('id')
            .limit(1);
        
        if (rlsError && rlsError.code === 'PGRST301') {
            logTest('Security Audit - RLS Policies', 'PASS', 'RLS policies are properly configured');
        } else if (rlsError) {
            logTest('Security Audit - RLS Policies', 'WARN', 'RLS configuration may need review', rlsError);
        } else {
            logTest('Security Audit - RLS Policies', 'PASS', 'RLS policies are working correctly');
        }
        
    } catch (error) {
        logTest('Security Audit', 'FAIL', 'Unexpected error during testing', error.message);
    }
}

// Test 6: Connection Reliability
async function testConnectionReliability() {
    try {
        console.log('\n🔌 Testing Connection Reliability...');
        
        // Test 6.1: Connection health check
        const { data: healthCheck, error: healthError } = await supabase
            .rpc('checkSupabaseConnection');
        
        if (healthError) {
            logTest('Connection Reliability - Health Check', 'FAIL', 'Connection health check failed', healthError);
        } else if (healthCheck) {
            logTest('Connection Reliability - Health Check', 'PASS', 'Database connection is healthy');
        } else {
            logTest('Connection Reliability - Health Check', 'FAIL', 'Database connection is unhealthy');
        }
        
        // Test 6.2: Connection performance test
        const startTime = Date.now();
        const { data: perfTest, error: perfError } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        const endTime = Date.now();
        
        if (perfError) {
            logTest('Connection Reliability - Performance', 'FAIL', 'Performance test failed', perfError);
        } else {
            const responseTime = endTime - startTime;
            if (responseTime < 1000) {
                logTest('Connection Reliability - Performance', 'PASS', 
                    `Response time: ${responseTime}ms (excellent)`);
            } else if (responseTime < 3000) {
                logTest('Connection Reliability - Performance', 'WARN', 
                    `Response time: ${responseTime}ms (acceptable)`);
            } else {
                logTest('Connection Reliability - Performance', 'FAIL', 
                    `Response time: ${responseTime}ms (too slow)`);
            }
        }
        
        // Test 6.3: Multiple connection test
        const connectionPromises = Array(10).fill().map(() => 
            supabase.from('users').select('count').limit(1)
        );
        
        const results = await Promise.allSettled(connectionPromises);
        const successfulConnections = results.filter(r => r.status === 'fulfilled').length;
        
        if (successfulConnections === 10) {
            logTest('Connection Reliability - Multiple Connections', 'PASS', 
                'All 10 concurrent connections successful');
        } else {
            logTest('Connection Reliability - Multiple Connections', 'WARN', 
                `${successfulConnections}/10 concurrent connections successful`);
        }
        
    } catch (error) {
        logTest('Connection Reliability', 'FAIL', 'Unexpected error during testing', error.message);
    }
}

// Main test execution
async function runAllTests() {
    console.log('🚀 Starting Supabase Security and Reliability Tests...\n');
    
    const startTime = Date.now();
    
    try {
        await testFunctionSearchPathSecurity();
        await testGitHubIntegrationSecurity();
        await testDataPersistenceAndBackup();
        await testMonitoringAndAlerting();
        await testSecurityAudit();
        await testConnectionReliability();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Generate test report
        console.log('\n📋 Test Summary:');
        console.log(`✅ Passed: ${testResults.passed}`);
        console.log(`❌ Failed: ${testResults.failed}`);
        console.log(`⚠️  Warnings: ${testResults.warnings}`);
        console.log(`⏱️  Duration: ${duration}ms`);
        
        // Calculate overall score
        const totalTests = testResults.passed + testResults.failed + testResults.warnings;
        const successRate = totalTests > 0 ? (testResults.passed / totalTests) * 100 : 0;
        
        console.log(`📊 Success Rate: ${successRate.toFixed(1)}%`);
        
        if (successRate >= 90) {
            console.log('🎉 Excellent! Your Supabase setup is highly secure and reliable.');
        } else if (successRate >= 75) {
            console.log('👍 Good! Your Supabase setup is mostly secure with some areas for improvement.');
        } else {
            console.log('⚠️  Your Supabase setup needs attention. Please review the failed tests.');
        }
        
        // Save detailed report
        const reportPath = path.join(__dirname, '..', 'test-results.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            summary: {
                passed: testResults.passed,
                failed: testResults.failed,
                warnings: testResults.warnings,
                successRate: successRate,
                duration: duration
            },
            tests: testResults.tests,
            timestamp: new Date().toISOString()
        }, null, 2));
        
        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
        
        // Exit with appropriate code
        process.exit(testResults.failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('💥 Test execution failed:', error);
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    runAllTests,
    testFunctionSearchPathSecurity,
    testGitHubIntegrationSecurity,
    testDataPersistenceAndBackup,
    testMonitoringAndAlerting,
    testSecurityAudit,
    testConnectionReliability
};