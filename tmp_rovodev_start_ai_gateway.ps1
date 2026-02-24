# Start AI Gateway in background
Write-Host "Starting AI Gateway on http://localhost:8001..." -ForegroundColor Cyan

$job = Start-Job -ScriptBlock {
    Set-Location "D:\user\dekstop\ai_platforma\backend\ai-gateway"
    python main.py
}

Write-Host "AI Gateway started (Job ID: $($job.Id))" -ForegroundColor Green
Write-Host ""
Write-Host "To check status:" -ForegroundColor Yellow
Write-Host "  Receive-Job -Id $($job.Id) -Keep" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop AI Gateway:" -ForegroundColor Yellow
Write-Host "  Stop-Job -Id $($job.Id)" -ForegroundColor Gray
Write-Host "  Remove-Job -Id $($job.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "Waiting 5 seconds for AI Gateway to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Test connection
Write-Host "Testing AI Gateway connection..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✓ AI Gateway is running!" -ForegroundColor Green
    Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "✗ AI Gateway not responding yet" -ForegroundColor Red
    Write-Host "  Check job output: Receive-Job -Id $($job.Id) -Keep" -ForegroundColor Yellow
}

return $job.Id
