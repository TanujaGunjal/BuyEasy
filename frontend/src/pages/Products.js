import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import ProductCard from '../components/ProductCard';

const Products = () => {
  const location = useLocation();

  // Initialize filters from URL parameters
  const getInitialFilters = () => {
    const urlParams = new URLSearchParams(location.search);
    return {
      search: urlParams.get('search') || '',
      category: urlParams.get('category') || '',
      minPrice: urlParams.get('minPrice') || '',
      maxPrice: urlParams.get('maxPrice') || '',
      sort: urlParams.get('sort') || 'createdAt',
      order: urlParams.get('order') || 'desc',
    };
  };

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(getInitialFilters());
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

 const categories = [
  'Electronics',
  'Clothing',
  'Sports',
  'Home & Furniture',
  'Hand Bags',
  'Accessories',
  'Books',
  'Food',
  'Other'
];

  useEffect(() => {
    loadProducts();
  }, [filters, pagination.page]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: 12,
        ...filters,
      });

      const response = await api.get(`/products?${params}`);
      setProducts(response.data.data);
      setPagination({
        page: response.data.page,
        pages: response.data.pages,
        total: response.data.total,
      });
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPagination({ ...pagination, page: 1 });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadProducts();
  };

  return (
    <div className="products-page py-3">
      <div className="container">
        <h1 className="mb-2">All Products</h1>

        {/* Filters */}
        <div className="card mb-2">
          <form onSubmit={handleSearch} className="filters-form">
            <div className="grid grid-4">
              <div className="form-group">
                <label>Search</label>
                <input
                  type="text"
                  name="search"
                  className="form-control"
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <select
                  name="category"
                  className="form-control"
                  value={filters.category}
                  onChange={handleFilterChange}
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Min Price</label>
                <input
                  type="number"
                  name="minPrice"
                  className="form-control"
                  placeholder="$0"
                  value={filters.minPrice}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="form-group">
                <label>Max Price</label>
                <input
                  type="number"
                  name="maxPrice"
                  className="form-control"
                  placeholder="Any"
                  value={filters.maxPrice}
                  onChange={handleFilterChange}
                />
              </div>
            </div>

            <div className="flex-between mt-2">
              <button type="submit" className="btn btn-primary">
                Apply Filters
              </button>
              <div>
                <label>Sort By: </label>
                <select
                  name="sort"
                  className="form-control"
                  style={{ display: 'inline-block', width: 'auto', marginLeft: '10px' }}
                  value={filters.sort}
                  onChange={handleFilterChange}
                >
                  <option value="createdAt">Newest</option>
                  <option value="price">Price</option>
                  <option value="rating">Rating</option>
                  <option value="name">Name</option>
                </select>
                <select
                  name="order"
                  className="form-control"
                  style={{ display: 'inline-block', width: 'auto', marginLeft: '10px' }}
                  value={filters.order}
                  onChange={handleFilterChange}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="loading">Loading products...</div>
        ) : products.length === 0 ? (
          <div className="card text-center py-3">
            <h3>No products found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="mb-1">
              <strong>{pagination.total}</strong> products found
            </div>
            <div className="grid grid-4">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="pagination mt-2">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    className={`btn ${page === pagination.page ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPagination({ ...pagination, page })}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Products;
