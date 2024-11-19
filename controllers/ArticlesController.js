import Repository from '../models/repository.js';
import ArticleModel from '../models/article.js';
import Controller from './Controller.js';

export default
    class ArticlesController extends Controller {
        constructor(HttpContext) {
            super(HttpContext, new Repository(new ArticleModel()));
        }
    }