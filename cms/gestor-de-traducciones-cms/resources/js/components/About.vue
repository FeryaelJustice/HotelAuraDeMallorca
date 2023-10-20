<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card">
                    <div class="card-header">About Component</div>

                    <div class="card-body">
                        I'm about component.
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
        console.log('About mounted.')
    }
}
</script>
<style lang="scss" scoped></style>
