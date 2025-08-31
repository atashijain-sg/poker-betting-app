import React from 'react';
import { Paper, Typography, Card, CardContent, CardMedia, CardActionArea, Link, Grid, Divider } from '@mui/material';

const NewsPanel = ({ news, customerName }) => {
  if (!customerName) {
    return (
      <Paper style={{ padding: '2rem', textAlign: 'center' }}>
        <Typography variant="subtitle1">
          Select a customer to see latest news
        </Typography>
      </Paper>
    );
  }

  if (!news || news.length === 0) {
    return (
      <Paper style={{ padding: '2rem' }}>
        <Typography variant="h6" gutterBottom>
          News for {customerName}
        </Typography>
        <Divider style={{ margin: '1rem 0' }} />
        <Typography variant="subtitle1">
          No recent news found for this customer
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper style={{ padding: '1rem' }}>
      <Typography variant="h6" gutterBottom>
        Latest News for {customerName}
      </Typography>
      <Divider style={{ margin: '1rem 0' }} />
      <Grid container spacing={2}>
        {news.map((article, index) => (
          <Grid item xs={12} key={index}>
            <Card>
              <CardActionArea component={Link} href={article.url} target="_blank" rel="noopener noreferrer">
                <Grid container>
                  {article.image && (
                    <Grid item xs={3}>
                      <CardMedia
                        component="img"
                        alt={article.title}
                        height="140"
                        image={article.image}
                        title={article.title}
                      />
                    </Grid>
                  )}
                  <Grid item xs={article.image ? 9 : 12}>
                    <CardContent>
                      <Typography variant="h6" component="h2">
                        {article.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary" component="p">
                        {new Date(article.publishedAt).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body1">
                        {article.description}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Source: {article.source.name}
                      </Typography>
                    </CardContent>
                  </Grid>
                </Grid>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

export default NewsPanel;