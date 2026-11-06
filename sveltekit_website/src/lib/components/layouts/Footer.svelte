<script>
    import { Col, Container, Row } from '@sveltestrap/sveltestrap';
</script>

<footer class="footer">
    <Container fluid>
        <Row>
            <Col sm={6}>
                {new Date().getFullYear()} © Federico Manuri - Andrea Sanna, Politecnico di Torino
            </Col>
        </Row>
    </Container>
</footer>
