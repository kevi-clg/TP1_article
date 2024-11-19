const periodicRefreshPeriod = 10;
let categories = [];
let selectedCategory = "";
let selectedKeyWords = "";
let currentETag = "";
let hold_Periodic_Refresh = false;
let pageManager;
let itemLayout;

let waiting = null;
let waitingGifTrigger = 2000;
function addWaitingGif() {
    clearTimeout(waiting);
    waiting = setTimeout(() => {
        $("#itemsPanel").append($("<div id='waitingGif' class='waitingGifcontainer'><img class='waitingGif' src='Loading_icon.gif' /></div>'"));
    }, waitingGifTrigger)
}
function removeWaitingGif() {
    clearTimeout(waiting);
    $("#waitingGif").remove();
}

Init_UI();

async function Init_UI() {
    itemLayout = {
        width: $("#sample").outerWidth(),
        height: $("#sample").outerHeight()
    };
    pageManager = new PageManager('scrollPanel', 'itemsPanel', itemLayout, renderArticles);
    compileCategories();
    $('#createArticle').on("click", async function () {
        renderCreateArticleForm();
    });
    $('#abort').on("click", async function () {
        showArticles()
    });
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    showArticles();
    $("#articleForm").hide();
    $("#aboutContainer").hide();
    start_Periodic_Refresh();
}
function showArticles() {
    $("#actionTitle").text("Fil de nouvelles");
    $("#scrollPanel").show();
    $('#abort').hide();
    $('#articleForm').hide();
    $('#aboutContainer').hide();
    $("#createArticle").show();
    $("#researchWords").show();
    hold_Periodic_Refresh = false;
}
function hideArticles() {
    $("#scrollPanel").hide();
    $("#createArticle").hide();
    $("#researchWords").hide();
    $("#abort").show();
    hold_Periodic_Refresh = true;
}
function start_Periodic_Refresh() {
    setInterval(async () => {
        if (!hold_Periodic_Refresh) {
            let etag = await Articles_API.HEAD();
            if (currentETag != etag) {
                currentETag = etag;
                await pageManager.update(false);
                compileCategories();
            }
        }
    },
        periodicRefreshPeriod * 1000);
}
function renderAbout() {
    hideArticles();
    $("#actionTitle").text("À propos...");
    $("#aboutContainer").show();
}
function updateDropDownMenu() {
    let DDMenu = $("#DDMenu");
    let selectClass = selectedCategory === "" ? "fa-check" : "fa-fw";
    DDMenu.empty();
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="allCatCmd">
            <i class="menuIcon fa ${selectClass} mx-2"></i> Toutes les catégories
        </div>
        `));
    DDMenu.append($(`<div class="dropdown-divider"></div>`));
    categories.forEach(category => {
        selectClass = selectedCategory === category ? "fa-check" : "fa-fw";
        DDMenu.append($(`
            <div class="dropdown-item menuItemLayout category" id="allCatCmd">
                <i class="menuIcon fa ${selectClass} mx-2"></i> ${category}
            </div>
        `));
    })
    DDMenu.append($(`<div class="dropdown-divider"></div> `));
    DDMenu.append($(`
        <div class="dropdown-item menuItemLayout" id="aboutCmd">
            <i class="menuIcon fa fa-info-circle mx-2"></i> À propos...
        </div>
        `));
    $('#aboutCmd').on("click", function () {
        renderAbout();
    });
    $('#allCatCmd').on("click", function () {
        showArticles();
        selectedCategory = "";
        updateDropDownMenu();
        pageManager.reset();
    });
    $('.category').on("click", function () {
        showArticles();
        selectedCategory = $(this).text().trim();
        updateDropDownMenu();
        pageManager.reset();
    });
    $('.keyWord').on("click", function(){
        selectedKeyWords = $('#keyWord').text().trim().replace(/ /g, ',');
    });

    
    
}
async function compileCategories() {
    categories = [];
    let response = await Articles_API.GetQuery("?fields=category&sort=category");
    if (!Articles_API.error) {
        let items = response.data;
        if (items != null) {
            items.forEach(item => {
                if (!categories.includes(item.Category))
                    categories.push(item.Category);
            })
            updateDropDownMenu(categories);
        }
    }
}
async function renderArticles(queryString) {
    
    let endOfData = false;
    queryString += "&sort=Creation,desc";
    if (selectedCategory != "") queryString += "&category=" + selectedCategory;
    if (selectedKeyWords != "") queryString += "&keyWords=" + selectedKeyWords;
    addWaitingGif();
    let response = await Articles_API.Get(queryString);
    if (!Articles_API.error) {
        currentETag = response.ETag;
        let Articles = response.data;
        if (Articles.length > 0) {
            Articles.forEach(Article => {
                    $("#itemsPanel").append(renderArticle(Article)); 
            });

            $('#toggle-button').on("click", function(){
                console.log("bitch ass nigga");
                const toggleButton = $(this); 
                const textContainer = $('.text-container');
                if (textContainer.classList.contains("expanded")) {
                    textContainer.classList.remove("expanded");
                    toggleButton.textContent = "Voir plus";
                } else {
                    textContainer.classList.add("expanded");
                    toggleButton.textContent = "Voir moins";
                }
            });

            $(".editCmd").off();
            $(".editCmd").on("click", function () {
                renderEditArticleForm($(this).attr("editArticleId"));
            });
            $(".deleteCmd").off();
            $(".deleteCmd").on("click", function () {
                renderDeleteArticleForm($(this).attr("deleteArticleId"));
            });
        } else
            endOfData = true;
    } else {
        renderError(Articles_API.currentHttpError);
    }
    removeWaitingGif();
    return endOfData;
}

function renderError(message) {
    hideArticles();
    $("#actionTitle").text("Erreur du serveur...");
    $("#errorContainer").show();
    $("#errorContainer").append($(`<div>${message}</div>`));
}
function renderCreateArticleForm() {
    renderArticleForm();
}
async function renderEditArticleForm(id) {
    addWaitingGif();
    let response = await Articles_API.Get(id)
    if (!Articles_API.error) {
        let Article = response.data;
        if (Article !== null)
            renderArticleForm(Article);
        else
            renderError("Article introuvable!");
    } else {
        renderError(Articles_API.currentHttpError);
    }
    removeWaitingGif();
}
async function renderDeleteArticleForm(id) {
    hideArticles();
    $("#actionTitle").text("Retrait");
    $('#articleForm').show();
    $('#articleForm').empty();
    let response = await Articles_API.Get(id)
    if (!Articles_API.error) {
        let Article = response.data;
        if (Article !== null) {
            $("#articleForm").append(`
        <div class="ArticledeleteForm">
            <h4>Effacer l'article suivant?</h4>
            <br>
            <div class="ArticleRow" id=${Article.Id}">
                <div class="ArticleContainer noselect">
                    <div class="ArticleLayout">
                    <span class="ArticleCategory">${Article.Category}</span>
                        <div class="Article">
                            <span class="ArticleTitle">${Article.Title}</span>
                            <img class="image" src='${Article.Image}' />
                        </div>
                        
                    </div>
                    
                </div>
            </div>   
            <br>
            <input type="button" value="Effacer" id="deleteArticle" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </div>    
        `);
            $('#deleteArticle').on("click", async function () {
                await Articles_API.Delete(Article.Id);
                if (!Articles_API.error) {
                    showArticles();
                    await pageManager.update(false);
                    compileCategories();
                }
                else {
                    console.log(Articles_API.currentHttpError)
                    renderError("Une erreur est survenue!");
                }
            });
            $('#cancel').on("click", function () {
                showArticles();
            });

        } else {
            renderError("Article introuvable!");
        }
    } else
        renderError(Articles_API.currentHttpError);
}
function getFormData($form) {
    const removeTag = new RegExp("(<[a-zA-Z0-9]+>)|(</[a-zA-Z0-9]+>)", "g");
    var jsonObject = {};
    $.each($form.serializeArray(), (index, control) => {
        jsonObject[control.name] = control.value.replace(removeTag, "");
    });
    return jsonObject;
}
function newArticle() {
    Article = {};
    Article.Id = 0;
    Article.Title = "";
    Article.Text = "";
    Article.Category = "";
    Article.Creation = 0;
    Article.Image = "article_logo.png";
    return Article;
}

function renderArticleForm(Article = null) {
    hideArticles();
    let create = Article == null;
    let favicon = `<div class="big-favicon"></div>`;
    if (create)
        Article = newArticle();
    else
    
    $("#actionTitle").text(create ? "Création" : "Modification");
    $("#articleForm").show();
    $("#articleForm").empty();
    $("#articleForm").append(`
        <form class="form" id="ArticleForm">
            <a href="${Article.Url}" target="_blank" id="faviconLink" class="big-favicon" > ${favicon} </a>
            <br>
            <input type="hidden" name="Id" value="${Article.Id}"/>
            
            <input type="hidden" name="Creation" value="${new Date().getTime()}"/>

            <label for="Title" class="form-label">Titre </label>
            <input 
                class="form-control "
                name="Title" 
                id="Title" 
                placeholder="Titre"
                required
                RequireMessage="Veuillez entrer un titre"
                InvalidMessage="Le titre comporte un caractère illégal"
                value="${Article.Title}"
            />
            
            <label for="Text" class="form-label">Texte</label>
            <textarea
                class="form-control"
                name="Text"
                id="Text"
                placeholder="Texte"
                required
                data-require-message="Veuillez entrer un texte"
                data-invalid-message="Le texte comporte un caractère illégal"
            >${Article.Text}</textarea>

            <label for="Category" class="form-label">Catégorie </label>
            <input 
                class="form-control"
                name="Category"
                id="Category"
                placeholder="Catégorie"
                required
                value="${Article.Category}"
            />

             <!-- nécessite le fichier javascript 'imageControl.js' -->
            <label class="form-label">Image </label>
            <div   class='imageUploader' 
                   newImage='${create}' 
                   controlId='Image' 
                   imageSrc='${Article.Image}' 
                   waitingImage="Loading_icon.gif">
            </div>


            <br>
            <input type="submit" value="Enregistrer" id="saveArticle" class="btn btn-primary">
            <input type="button" value="Annuler" id="cancel" class="btn btn-secondary">
        </form>
    `);
    initImageUploaders();
    initFormValidation();

    $('#articleForm').on("submit", async function (event) {
        event.preventDefault();
        let Article = getFormData($("#ArticleForm"));
        Article = await Articles_API.Save(Article, create);
        if (!Articles_API.error) {
            showArticles();
            await pageManager.update(false);
            compileCategories();
            pageManager.scrollToElem(Article.Id);
        }
        else
            renderError("Une erreur est survenue!");
    });
    $('#cancel').on("click", function () {
        showArticles();
    });
}
function makeFavicon(url, big = false) {
    // Utiliser l'API de google pour extraire le favicon du site pointé par url
    // retourne un élément div comportant le favicon en tant qu'image de fond
    ///////////////////////////////////////////////////////////////////////////
    if (url.slice(-1) != "/") url += "/";
    let faviconClass = "favicon";
    if (big) faviconClass = "big-favicon";
    url = "http://www.google.com/s2/favicons?sz=64&domain=" + url;
    return `<div class="${faviconClass}" style="background-image: url('${url}');"></div>`;
}
function renderArticle(Article) {
    var date = convertToFrenchDate(Article.Creation)

    return $(`
     <div class="ArticleRow" id='${Article.Id}'>
        <div class="ArticleContainer noselect">
            <div class="ArticleLayout">
            <div class="ArticleCategoryContainer">
                <span class="ArticleCategory">${Article.Category}</span>
                <div class="ArticleCommandPanel">
                    <span class="editCmd cmdIcon2 fa fa-pencil" editArticleId="${Article.Id}" title="Modifier ${Article.Title}"></span>
                    <span class="deleteCmd cmdIcon2 fa fa-trash" deleteArticleId="${Article.Id}" title="Effacer ${Article.Title}"></span>
                </div>
            </div>
                <div class="Article">
                    <span class="ArticleTitle">${Article.Title}</span>
                    <img class="image" src='${Article.Image}' />
                    <span>${date}</span><br>
                    <div class="text-container">
                        <span class="ArticleText">${Article.Text}</span>
                    </div>
                    <p id="voirPlus">Voir plus</p>
                </div>
               
            </div>
            
        </div>
    </div>           
    `);
}

function convertToFrenchDate(numeric_date) {
    date = new Date(numeric_date);
    var options = { year: 'numeric', month: 'long', day: 'numeric' };
    var opt_weekday = { weekday: 'long' };
    var weekday = toTitleCase(date.toLocaleDateString("fr-FR", opt_weekday));

    function toTitleCase(str) {
        return str.replace(
            /\w\S*/g,
            function (txt) {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            }
        );
    }
    return weekday + " le " + date.toLocaleDateString("fr-FR", options) + " @ " + date.toLocaleTimeString("fr-FR");
}