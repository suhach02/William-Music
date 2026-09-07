#easy obraz oficcial Nginx based on Alpine Linux
FROM nginx:alpine

#fjerne defoult start page Nginx
RUN rm -rf /usr/share/nginx/html/*

#kopier alle mine files af min hjemesider til repo
COPY . /usr/share/nginx/html

#åbn 80-erne port 
EXPOSE 80

#lancerer Nginx på bagground 
CMD ["nginx", "-g", "daemon off;"]