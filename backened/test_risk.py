from services.risk_service import RiskService
status, risk = RiskService.classify(-0.229)

print(status)
print(risk)