package main

# #6 Política-como-código — o baseline vira GATE executável (não só relatório).
# Roda no CI (conftest test conformity.json). Falha o build se o app declarar
# menos que o baseline mínimo. Complementa o drift-check da frota (que observa
# em runtime) com um portão em build-time.

required_headers := {
	"content-security-policy",
	"strict-transport-security",
	"x-frame-options",
	"x-content-type-options",
	"referrer-policy",
	"permissions-policy",
}

deny contains msg if {
	have := {h | some h in input.baseline.securityHeaders}
	missing := required_headers - have
	count(missing) > 0
	msg := sprintf("baseline: faltam headers de seguranca: %v", [missing])
}

deny contains msg if {
	input.baseline.rbac != "deny-by-default"
	msg := "baseline: rbac deve ser 'deny-by-default'"
}

deny contains msg if {
	not input.baseline.ciqa
	msg := "baseline: ciqa ausente (CI-QA obrigatoria)"
}

deny contains msg if {
	some required in {"/api/health", "/api/conformity"}
	not required in input.baseline.endpoints
	msg := sprintf("baseline: endpoint obrigatorio ausente: %v", [required])
}
