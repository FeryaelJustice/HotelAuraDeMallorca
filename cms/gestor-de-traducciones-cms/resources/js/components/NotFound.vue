<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Not Found</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'notfound',
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
