<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Sobre nosotros</div>

                    <div class="card-body" id="about">
                        <p class="about-text">
                            Somos tu gestor de traducciones de confianza para tu sitio web.
                            Creado por Fernando González Serrano en 2023.
                        </p>
                        <br>
                        <a class="about-mail" href="mailto:nano9gs@hotmail.es">Correo de Feryael Justice</a>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'about',
    mounted() {
        // console.log('About mounted.')
    }
}
</script>
<style lang="scss" scoped>
.card {
    height: 100%;
    width: 100%;
    margin-bottom: 6%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.card-header {
    width: 100%;
    text-align: center;
}
</style>
