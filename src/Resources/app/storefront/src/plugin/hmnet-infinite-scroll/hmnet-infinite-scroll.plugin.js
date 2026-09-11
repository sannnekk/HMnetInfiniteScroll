const Plugin = window.PluginBaseClass;

export default class HmnetInfiniteScrollPlugin extends Plugin {
    static options = {
        pageParameter: 'p',
        dataUrl: '',
        params: {},
        currentPage: 1,
        totalPages: 1,
        preloadOffset: 400,
        resultContainerSelector: '.js-listing-wrapper',
        productCardSelector: '.cms-listing-col',
        paginationSelector: '.listing-pagination',
        sentinelSelector: '.hmnet-infinite-scroll-sentinel',
        listingSelector: '.cms-element-product-listing',
    };

    init() {
        this.currentPage = Number(this.options.currentPage) || 1;
        this.totalPages = Number(this.options.totalPages) || 1;
        this.isLoading = false;

        this.resultContainer = this.el.querySelector(
            this.options.resultContainerSelector
        );

        if (!this.resultContainer || this.totalPages <= this.currentPage) {
            return;
        }

        this.sentinel = this._ensureSentinel();
        this._hidePagination();
        this._registerObserver();
        this._markInitialized();
    }

    _ensureSentinel() {
        let sentinel = this.el.querySelector(this.options.sentinelSelector);

        if (!sentinel) {
            sentinel = document.createElement('div');
            sentinel.classList.add(
                this.options.sentinelSelector.replace('.', '')
            );
            sentinel.setAttribute('aria-hidden', 'true');
            this.el.appendChild(sentinel);
        }

        return sentinel;
    }

    _registerObserver() {
        const rootMargin = `0px 0px ${
            Number(this.options.preloadOffset) || 0
        }px 0px`;

        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        this._loadNextPage();
                    }
                });
            },
            {
                root: null,
                threshold: 0,
                rootMargin,
            }
        );

        this.observer.observe(this.sentinel);
    }

    _loadNextPage() {
        if (this.isLoading) {
            return;
        }

        if (this.currentPage >= this.totalPages) {
            this._complete();
            return;
        }

        this.isLoading = true;
        this.sentinel.classList.add('is-loading');

        const nextPage = this.currentPage + 1;
        const url = this._buildPageUrl(nextPage);

        fetch(url, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'text/html',
            },
        })
            .then((response) => response.text())
            .then((html) => {
                this._appendFromResponse(html);
                this.currentPage = nextPage;
                this._updateHistory();
                this._completeIfLastPage();
            })
            .catch((error) => {
                console.error('[HMnetInfiniteScroll]', error);
                this._complete();
            })
            .finally(() => {
                this.isLoading = false;
                this.sentinel.classList.remove('is-loading');
            });
    }

    _appendFromResponse(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const nextListing = doc.querySelector(
            this.options.resultContainerSelector
        );

        if (!nextListing) {
            this._complete();
            return;
        }

        const newItems = nextListing.querySelectorAll(
            this.options.productCardSelector
        );

        newItems.forEach((item) => {
            this.resultContainer.appendChild(item);
        });

        window.PluginManager.initializePlugins();
    }

    _buildPageUrl(page) {
        const baseUrl = this.options.dataUrl || window.location.pathname;
        const url = new URL(baseUrl, window.location.origin);
        const params = new URLSearchParams(window.location.search);

        Object.entries(this.options.params || {}).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') {
                return;
            }

            if (Array.isArray(value)) {
                params.delete(key);
                value.forEach((item) => params.append(key, item));
                return;
            }

            params.set(key, value);
        });

        params.set(this.options.pageParameter, page.toString());
        url.search = params.toString();

        return url.toString();
    }

    _hidePagination() {
        const paginations = this.el.querySelectorAll(
            this.options.paginationSelector
        );

        paginations.forEach((nav) => {
            nav.setAttribute('data-hmnet-hidden', 'true');
        });
    }

    _updateHistory() {
        const url = new URL(window.location.href);
        url.searchParams.set(
            this.options.pageParameter,
            this.currentPage.toString()
        );
        window.history.replaceState(
            window.history.state,
            document.title,
            url.toString()
        );
    }

    _completeIfLastPage() {
        if (this.currentPage >= this.totalPages) {
            this._complete();
        }
    }

    _complete() {
        if (this.observer) {
            this.observer.disconnect();
        }

        this.sentinel.classList.add('is-complete');
    }

    _markInitialized() {
        this.el.setAttribute('data-hmnet-infinite-scroll-initialized', 'true');
    }
}
