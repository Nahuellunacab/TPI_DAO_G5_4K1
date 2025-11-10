def test_health_endpoint(client):
    """Prueba que el endpoint /health devuelve un estado 200 OK y el JSON esperado."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json == {"status": "ok"}
