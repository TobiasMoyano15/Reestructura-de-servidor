import { CustomError } from '../Service/errors/CustomError.js';
import { EError } from '../Service/errors/enums.js';
import { generateInvalidProductError } from '../Service/errors/info.js';
import { productService , userService } from '../Service/service.js';
import { logger } from '../util/logger.js'

class ProductController {
    constructor() {
        this.productService = productService;
        this.userService = userService;
    }

    createProduct = async (req, res, next) => {
        const { title, description, code, price, status = true, stock, category, thumbnails } = req.body;
        const user = req.user;

        try {

            if (!title || !description || !code || !price || !stock || !category) {
                CustomError.createError({
                    name: 'Error al crear el producto',
                    cause: generateInvalidProductError({ title, description, code, price, stock, category }),
                    message: 'Error al crear el producto, campos faltantes o inválidos',
                    code: EError.MISSING_OR_INVALID_REQUIRED_DATA_ERROR
                });
            }

            const { docs: products } = await productService.getProducts();
            if (products.find((prod) => prod.code === code))
                return res.status(400).send({ status: 'error', error: `No se pudo agregar el producto con el código ${code} porque ya existe un producto con ese código` });
            
            let owner;
            if (user.role === 'premium') {
                owner = user.email;
            } else if (user.role === 'admin') {
                owner = 'admin';
            } else {
                owner = 'admin';
            }

            const newProduct = await productService.createProduct(title, description, code, price, status, stock, category, thumbnails, owner);
            res.status(201).send({ status: 'success', payload: newProduct });

        } catch (error) {
            next(error);
        }
    };

    getProducts = async (req, res) => {
        try {
            const { limit = 10, pageNum = 1, category, status, product: title, sortByPrice } = req.query;
            const { docs, page, hasPrevPage, hasNextPage, prevPage, nextPage, totalPages } = await productService.getProducts({ limit, pageNum, category, status, title, sortByPrice });

            let prevLink = null;
            let nextLink = null;

            if (hasPrevPage) {
                prevLink = `/products?pageNum=${prevPage}`;
                if (limit) prevLink += `&limit=${limit}`;
                if (title) prevLink += `&product=${title}`;
                if (category) prevLink += `&category=${category}`;
                if (status) prevLink += `&status=${status}`;
                if (sortByPrice) prevLink += `&sortByPrice=${sortByPrice}`;
            }

            if (hasNextPage) {
                nextLink = `/products?pageNum=${nextPage}`;
                if (limit) nextLink += `&limit=${limit}`;
                if (title) nextLink += `&product=${title}`;
                if (category) nextLink += `&category=${category}`;
                if (status) nextLink += `&status=${status}`;
                if (sortByPrice) nextLink += `&sortByPrice=${sortByPrice}`;
            }

            res.status(200).send({
                status: 'success',
                payload: {
                    products: docs,
                    totalPages,
                    prevPage,
                    nextPage,
                    page,
                    hasPrevPage,
                    hasNextPage,
                    prevLink,
                    nextLink
                }
            });
        } catch (error) {
            res.status(500).send({ status: 'error', error: error });
        }
    };

    getProductBy = async (req, res) => {
        const { pid } = req.params;
        const productFound = await productService.getProduct({ _id: pid });
        try {
            if (!productFound)
                return res.status(400).send({ status: 'error', error: `¡ERROR! No existe ningún producto con el id ${pid}` });

            res.status(200).send({ status: 'success', payload: productFound });

        } catch (error) {
            res.status(500).send({ status: 'error', error: error.message });
        }
    };

    updateProduct = async (req, res) => {
        const { pid } = req.params;
        const { title, description, code, price, status, stock, category, thumbnails } = req.body;

        const productFound = await productService.getProduct({ _id: pid });
        try {
            if (!title || !description || !code || !price || !stock || !category) {
                return res.status(400).send({ status: 'error', error: 'faltan campos' });
            }

            if (!productFound) return res.status(400).send({ status: 'error', error: `No existe el producto con el id ${pid}` });

            const updatedProduct = await productService.updateProduct(pid, { title, description, code, price, status, stock, category, thumbnails });
            res.status(201).send({ status: 'success', payload: updatedProduct });

        } catch (error) {
            res.status(500).send({ status: 'error', error: error });
        }
    };

    removeProduct = async (req, res) => {
        const { pid } = req.params;
        const user = req.user

        try {
            const productFound = await productService.getProduct({ _id: pid });
            if (!productFound) return res.status(400).send({ status: 'error', error: `¡ERROR! No existe ningún producto con el id ${pid}` });
            if (user.role === 'premium' && productFound.owner !== user.email) return res.status(401).send({ status: 'error', error: `el producto ${productFound.title} no le pertenece a ${user.email}, por lo tanto no puede borrarlo` });
            
            await productService.deleteProduct(pid);
            res.status(200).send({ status: 'success', payload: productFound });

        } catch (error) {
            res.status(500).send({ status: 'error', error: error.message });
        }
    };
}

export default ProductController;