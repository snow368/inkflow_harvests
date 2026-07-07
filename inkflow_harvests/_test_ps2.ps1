$logFile = "F:\inkflow app\InkFlow_Project\inkflow_harvests\_ps_test_out.txt"
"Hello from PowerShell at $(Get-Date)" | Out-File -FilePath $logFile -Encoding utf8
"test line 2" | Out-File -FilePath $logFile -Encoding utf8 -Append
