const axiosInstance = axios.create({
   baseURL:
      window.location.hostname === "localhost"
         ? "http://localhost:3000/api/v1"
         : "https://coursera-app.vercel.app/api/v1",
   withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
   failedQueue.forEach((prom) => {
      if (error) prom.reject(error);
      else prom.resolve();
   });
   failedQueue = [];
};

axiosInstance.interceptors.response.use(
   (response) => response,
   async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
         if (isRefreshing) {
            return new Promise((resolve, reject) => {
               failedQueue.push({ resolve, reject });
            })
               .then(() => axiosInstance(originalRequest))
               .catch((err) => Promise.reject(err));
         }

         isRefreshing = true;
         originalRequest._retry = true;

         try {
            const baseUrl =
               window.location.hostname === "localhost"
                  ? "http://localhost:3000/api/v1"
                  : "https://coursera-app.vercel.app/api/v1";

            await axios.get(`${baseUrl}/user/refresh-token`, {
               withCredentials: true,
            });

            processQueue(null);
            return await axiosInstance(originalRequest);
         } catch (refreshError) {
            processQueue(refreshError);
            window.location.href = "/auth.html";
            return Promise.reject(refreshError);
         } finally {
            isRefreshing = false;
         }
      }

      return Promise.reject(error);
   }
);
