<template>
    <div class="container">
        <div class="row justify-content-center">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">Formulario de gestor de traducciones para tu web</div>

                    <div class="card-body">
                        <form action="">
                            <fieldset>
                                <legend>Página</legend>
                                <label for="pagename">Nombre de la página</label>
                                <input type="text" id="pagename" name="pagename">
                            </fieldset>
                            <fieldset>
                                <legend>Sección</legend>
                                <label for="pagesection">Sección de la página</label>
                                <input type="text" id="pagesection" name="pagesection">
                            </fieldset>
                            <fieldset>
                                <legend>Traducciones</legend>
                                <div class="languageSelect">
                                    <div class="myRow">
                                        <div v-for="language in LanguagesEnum" :key="language" style="margin-left:10px">
                                            <button type="button" class="btn btn-dark btn-space"
                                                @click="changeLanguageFields(language)">{{
                                                    language.toUpperCase() }}</button>
                                        </div>
                                    </div>
                                </div>
                                <div class="language-selection" v-for="language in LanguagesEnum" :key="language">
                                    <transtion name="fade">
                                        <div v-if="language == currentLanguage">
                                            <div v-if="language === 'es'">
                                                Español
                                            </div>
                                            <div v-else-if="language === 'en'">
                                                English
                                            </div>
                                            <div v-else-if="language === 'ca'">
                                                Catalan
                                            </div>
                                            <div v-else-if="language === 'de'">
                                                German
                                            </div>
                                        </div>
                                    </transtion>
                                </div>
                            </fieldset>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { LanguagesEnum } from "./../util/enums";
export default {
    name: 'home',
    data() {
        return {
            currentLanguage: 'es',
            LanguagesEnum,
        }
    },
    methods: {
        changeLanguageFields(lang) {
            this.currentLanguage = lang;
        },
    },
    mounted() {
        console.log('Home mounted.')
    }
}
</script>
<style lang="scss" scoped>
.myRow {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
}

fieldset {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    legend {
        float: none;
        text-align: center;
    }
}
</style>
